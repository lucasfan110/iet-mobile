import AntDesign from "@react-native-vector-icons/ant-design";
import React, { useRef } from "react";
import {
    View,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Text,
    TextInputProps,
    ViewStyle,
} from "react-native";
import { AGGIE_BLUE_LIGHTER } from "../Theme/commonStyles";
import Lucide from "@react-native-vector-icons/lucide";

export interface SearchBarProps {
    /** Current search text — keep this controlled from the parent/hook */
    value: string;
    /** Fires on every keystroke */
    onChangeText: (text: string) => void;
    /** Fires when the user submits (return key / search key) */
    onSubmit?: (text: string) => void;
    /** Fires when the clear (×) button is pressed */
    onClear?: () => void;
    /** Fires when the input gains/loses focus */
    onFocus?: () => void;
    onBlur?: () => void;
    placeholder?: string;
    /** Show a spinner instead of the search icon (e.g. while fetching results) */
    loading?: boolean;
    /** Disable all interaction */
    disabled?: boolean;
    /** Auto-focus on mount */
    autoFocus?: boolean;
    /** Optional element rendered on the far right (e.g. a "Cancel" button) */
    rightAccessory?: React.ReactNode;
    containerStyle?: ViewStyle;
    testID?: string;
    /** Escape hatch for any native TextInput prop not covered above */
    inputProps?: Partial<TextInputProps>;
}

export default function SearchBar({
    value,
    onChangeText,
    onSubmit,
    onClear,
    onFocus,
    onBlur,
    placeholder = "Search",
    loading = false,
    disabled = false,
    autoFocus = false,
    rightAccessory,
    containerStyle,
    testID = "search-bar",
    inputProps,
}: SearchBarProps) {
    const inputRef = useRef<TextInput>(null);

    const handleClear = () => {
        onChangeText("");
        onClear?.();
        inputRef.current?.focus();
    };

    return (
        <View
            style={[
                styles.container,
                disabled && styles.disabled,
                containerStyle,
            ]}
        >
            <View style={styles.field}>
                {loading ? (
                    <ActivityIndicator size="small" style={styles.icon} />
                ) : (
                    <Lucide name="search" style={styles.icon} />
                )}

                <TextInput
                    ref={inputRef}
                    testID={testID}
                    style={styles.input}
                    value={value}
                    onChangeText={onChangeText}
                    onSubmitEditing={() => onSubmit?.(value)}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    placeholderTextColor="#8E8E93"
                    editable={!disabled}
                    autoFocus={autoFocus}
                    autoCorrect={false}
                    autoCapitalize="none"
                    returnKeyType="search"
                    clearButtonMode="never" // we render our own, cross-platform
                    {...inputProps}
                />

                {value.length > 0 && !disabled && (
                    <TouchableOpacity
                        onPress={handleClear}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        testID={`${testID}-clear`}
                    >
                        <Text style={styles.clearIcon}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            {rightAccessory}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
    },
    disabled: {
        opacity: 0.5,
    },
    field: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 10,
        paddingHorizontal: 10,
        height: 40,
    },
    icon: {
        marginRight: 20,
        fontSize: 20,
        color: "white",
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: "white",
        padding: 0, // avoid Android default vertical padding
    },
    clearIcon: {
        fontSize: 14,
        color: "#8E8E93",
        marginLeft: 6,
        padding: 2,
    },
});
