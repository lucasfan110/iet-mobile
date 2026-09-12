import AntDesign from "@react-native-vector-icons/ant-design";
import React, { useRef, useState, useCallback } from "react";
import {
    Animated,
    Easing,
    LayoutChangeEvent,
    StyleProp,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";

export interface CollapsibleSectionProps {
    /** Header title text */
    title: string;
    /** Body content, shown/hidden when toggled */
    children: React.ReactNode;
    /** Start expanded instead of collapsed */
    initiallyExpanded?: boolean;
    /** Animation duration in ms */
    duration?: number;
    /** Called with the new expanded state whenever the section is toggled */
    onToggle?: (expanded: boolean) => void;
    /** Optional controlled mode: pass `expanded` + `onToggle` to drive it externally */
    expanded?: boolean;
    containerStyle?: StyleProp<ViewStyle>;
    headerStyle?: StyleProp<ViewStyle>;
    titleStyle?: StyleProp<TextStyle>;
    contentStyle?: StyleProp<ViewStyle>;
    /** Custom chevron/caret element. Receives the current expanded state. */
    renderIndicator?: (expanded: boolean) => React.ReactNode;
}

/**
 * A section header that expands/collapses its body with a smooth height
 * + fade animation. Pure React Native (Animated API) — no extra deps.
 *
 * Usage:
 *   <CollapsibleSection title="Shipping details">
 *     <Text>123 Main St, Springfield</Text>
 *   </CollapsibleSection>
 */
export default function CollapsibleSection({
    title,
    children,
    initiallyExpanded = false,
    duration = 250,
    onToggle,
    expanded: expandedProp,
    containerStyle,
    headerStyle,
    titleStyle,
    contentStyle,
    renderIndicator,
}: CollapsibleSectionProps) {
    const isControlled = expandedProp !== undefined;
    const [internalExpanded, setInternalExpanded] = useState(initiallyExpanded);
    const expanded = isControlled
        ? (expandedProp as boolean)
        : internalExpanded;

    const [contentHeight, setContentHeight] = useState(0);
    const [measured, setMeasured] = useState(false);

    // 0 = collapsed, 1 = expanded
    const animation = useRef(
        new Animated.Value(initiallyExpanded ? 1 : 0),
    ).current;

    const animatedHeight = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, contentHeight],
    });

    const animatedOpacity = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });

    const animatedRotate = animation.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "180deg"],
    });

    const runAnimation = useCallback(
        (toExpanded: boolean) => {
            Animated.timing(animation, {
                toValue: toExpanded ? 1 : 0,
                duration,
                easing: Easing.out(Easing.cubic),
                // Height can't run on the native thread, so the whole
                // animation (including the chevron rotation) stays on JS.
                useNativeDriver: false,
            }).start();
        },
        [animation, duration],
    );

    const toggle = useCallback(() => {
        const next = !expanded;
        if (!isControlled) {
            setInternalExpanded(next);
        }
        runAnimation(next);
        onToggle?.(next);
    }, [expanded, isControlled, onToggle, runAnimation]);

    // Keep the animation in sync when `expanded` is driven externally.
    const prevControlledExpanded = useRef(expandedProp);
    if (isControlled && prevControlledExpanded.current !== expandedProp) {
        prevControlledExpanded.current = expandedProp;
        runAnimation(!!expandedProp);
    }

    // Measure content height from a permanently-hidden "shadow" copy that is
    // ALWAYS absolutely positioned — never the visible copy, and never toggled
    // between absolute/relative. Flipping a measured view's position mode
    // mid-animation is what causes the classic "height shrinks a bit more on
    // every close/open" bug: the visible copy would briefly get re-measured
    // while its animated, overflow-hidden parent was mid-transition, and the
    // in-flight (partial) size would get recorded as the new "true" height.
    // Keeping measurement fully separate from what's on screen avoids that.
    const handleShadowLayout = (e: LayoutChangeEvent) => {
        const height = e.nativeEvent.layout.height;
        if (height > 0 && Math.round(height) !== Math.round(contentHeight)) {
            setContentHeight(height);
            setMeasured(true);
        }
    };

    return (
        <View style={[styles.container, containerStyle]}>
            <TouchableOpacity
                style={[styles.header, headerStyle]}
                onPress={toggle}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                accessibilityLabel={title}
            >
                <Text style={[styles.title, titleStyle]}>{title}</Text>
                {renderIndicator ? (
                    renderIndicator(expanded)
                ) : (
                    <Animated.Text
                        style={[
                            styles.chevron,
                            { transform: [{ rotate: animatedRotate }] },
                        ]}
                    >
                        <AntDesign name="caret-down" />
                    </Animated.Text>
                )}
            </TouchableOpacity>

            <Animated.View
                style={[
                    styles.body,
                    {
                        // Before the first measurement completes, don't clip content we
                        // don't yet know the height of: an initially-expanded section
                        // renders at its natural size (`undefined` height) instead of
                        // flashing collapsed. Once measured, height is fully driven by
                        // the animation.
                        height: measured
                            ? animatedHeight
                            : initiallyExpanded
                              ? undefined
                              : 0,
                        opacity: measured ? animatedOpacity : 1,
                    },
                ]}
            >
                {/* Visible content — always normal flow, never measured itself. */}
                <View style={contentStyle}>{children}</View>
            </Animated.View>

            {/* Hidden shadow copy used only to measure natural content height.
          Always absolute + invisible + non-interactive; re-renders (and
          re-measures) whenever `children` changes, so dynamic content
          keeps the animation accurate too. */}
            <View
                style={[styles.shadow, contentStyle]}
                onLayout={handleShadowLayout}
                pointerEvents="none"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
            >
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 10,
        backgroundColor: "#fff",
        overflow: "hidden",
        // The shadow measurer below is positioned absolutely relative to
        // this container.
        position: "relative",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    title: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111",
        flexShrink: 1,
    },
    chevron: {
        fontSize: 20,
        color: "#888",
        marginLeft: 8,
    },
    body: {
        overflow: "hidden",
    },
    shadow: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        opacity: 0,
        zIndex: -1,
    },
});
