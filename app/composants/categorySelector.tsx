import React from "react";
import { StyleSheet, View } from "react-native";
import { Chip } from "react-native-paper";

const categories = [
    { value: "vetement", label: "Vêtement", icon: "👗" },
    { value: "soins_et_astuces", label: "Soins et astuces", icon: "💄" },
    { value: "maquillage", label: "Maquillage", icon: "💋" },
    { value: "artisanat", label: "Artisanat", icon: "🎨" },
    { value: "electronique", label: "Electronique", icon: "📱" },
    { value: "accessoire", label: "Accessoire", icon: "👜" },
    { value: "chaussure", label: "Chaussure", icon: "👠" },
];

type Props = {
    selected: string | null;
    onSelect: (value: string) => void;
};

export default function CategorySelector({ selected, onSelect }: Props) {
    return (
        <View style={styles.container}>
            {categories.map((cat) => (
                <Chip
                    key={cat.value}
                    selected={selected === cat.value}
                    onPress={() => onSelect(cat.value)}
                    style={styles.chip}
                >
                    {cat.icon} {cat.label}
                </Chip>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8, // pour iOS ça fonctionne mieux avec marginRight/marginBottom
    },
    chip: {
        marginRight: 8,
        marginBottom: 8,
    },
});
