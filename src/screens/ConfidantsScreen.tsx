import { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { listConfidants } from "../data/confidants";
import type { Confidant } from "../types";

function daysSince(dateString: string | null): string {
  if (!dateString) return "never contacted";
  const days = Math.floor((Date.now() - new Date(dateString).getTime()) / 86_400_000);
  return `${days}d ago`;
}

export default function ConfidantsScreen() {
  const [confidants, setConfidants] = useState<Confidant[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setConfidants(await listConfidants());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Confidant Log</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={confidants}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{daysSince(item.lastContactAt)}</Text>
            {item.questionsQueued.length > 0 ? (
              <Text style={styles.meta}>Ask: {item.questionsQueued[0]}</Text>
            ) : null}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No confidants yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  heading: { fontSize: 24, fontWeight: "600", marginBottom: 12 },
  row: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#ccc" },
  name: { fontSize: 16, fontWeight: "500" },
  meta: { fontSize: 13, opacity: 0.6, marginTop: 2 },
  empty: { fontSize: 14, opacity: 0.5, paddingVertical: 8 },
  error: { color: "#c0392b", marginBottom: 8 },
});
