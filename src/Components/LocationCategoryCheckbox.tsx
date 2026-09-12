import Checkbox, { CheckboxProps } from "expo-checkbox";
import React, { useRef } from "react";
import {
    Pressable,
    StyleProp,
    StyleSheet,
    Text,
    TextStyle,
    View,
    ViewStyle,
} from "react-native";

interface Props extends CheckboxProps {
    containerStyle?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    children?: React.ReactNode;
}

export function LocationCategoryCheckbox({
    containerStyle,
    textStyle,
    children,
    ...checkboxProp
}: Props) {
    function handlePress() {
        if (checkboxProp.disabled) {
            return;
        }

        if (checkboxProp.onValueChange) {
            checkboxProp.onValueChange(!checkboxProp.value);
        }
    }

    return (
        <View style={[styles.categoryContainer, containerStyle]}>
            <Checkbox {...checkboxProp} />
            <Pressable onPress={handlePress}>
                <Text style={[styles.categoryText, textStyle]}>{children}</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    categoryContainer: {
        flexDirection: "row",
        gap: 5,
    },
    categoryText: {
        color: "white",
        // borderWidth: 1,
    },
});
