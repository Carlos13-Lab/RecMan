import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { BottomSheet } from "../../ui/BottomSheet";
import { FadeInUp } from "../../ui/FadeInUp";
import { Press } from "../../ui/Press";
import { Skeleton } from "../../ui/Skeleton";
import { colors, font, radius, shadowCard, space } from "../../ui/tokens";
import { useNotifications } from "../home/queries";
import { request } from "../session/session";

const when = (iso: string) => new Date(iso).toLocaleString("es-VE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function NotificationsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const q = useNotifications();
  const refresh = () => qc.invalidateQueries({ queryKey: ["notifications"] });
  const readAll = useMutation({ mutationFn: () => request("/api/notifications/read-all", { method: "PUT" }), onSuccess: refresh });
  const readOne = useMutation({ mutationFn: (id: string) => request(`/api/notifications/${id}/read`, { method: "PUT" }), onSuccess: refresh });
  const list = q.data ?? [];
  const unread = list.filter((n) => !n.read).length;

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.head}>
        <Text style={styles.title}>Notificaciones</Text>
        <Press onPress={onClose} accessibilityLabel="Cerrar" style={styles.close}>
          <MaterialIcons name="close" size={24} color={colors.muted} />
        </Press>
      </View>
      {unread > 0 ? (
        <Press haptic onPress={() => readAll.mutate()} accessibilityRole="button" style={styles.readAll}>
          <Text style={styles.readAllText}>Marcar todo como leído</Text>
        </Press>
      ) : null}
      <ScrollView
        style={{ minHeight: 220 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} colors={[colors.primary]} />}
        contentContainerStyle={{ gap: space.sm, paddingBottom: space.md }}
      >
        {q.isLoading ? [0, 1, 2].map((i) => <Skeleton key={i} height={76} rounded={radius.xl} />) : null}
        {q.error ? <Text style={styles.error}>{q.error.message}</Text> : null}
        {q.data && list.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons name="notifications-none" size={40} color={colors.gray400} />
            <Text style={styles.emptyTitle}>Estás al día</Text>
            <Text style={styles.emptyText}>No tienes notificaciones por ahora.</Text>
          </View>
        ) : null}
        {list.map((n, i) => (
          <FadeInUp key={n.id} index={i}>
            <Press onPress={n.read ? undefined : () => readOne.mutate(n.id)} style={[styles.item, !n.read && styles.itemUnread]}>
              <View style={[styles.dot, n.read && { backgroundColor: "transparent" }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{n.title}</Text>
                <Text style={styles.itemBody}>{n.body}</Text>
                <Text style={styles.itemTime}>{when(n.createdAt)}</Text>
              </View>
            </Press>
          </FadeInUp>
        ))}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: font.bold, fontSize: 22, letterSpacing: -0.3, color: colors.text },
  close: { padding: space.sm, borderRadius: radius.full },
  readAll: { alignSelf: "flex-start", paddingVertical: space.sm, marginBottom: space.sm },
  readAllText: { fontFamily: font.semibold, fontSize: 14, color: colors.primary },
  item: { flexDirection: "row", gap: space.md, padding: space.lg, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  itemUnread: { borderColor: "#c7caff", ...shadowCard },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, backgroundColor: colors.primary },
  itemTitle: { fontFamily: font.bold, fontSize: 15, color: colors.text },
  itemBody: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  itemTime: { fontFamily: font.medium, fontSize: 11, color: colors.gray400, marginTop: 6 },
  empty: { alignItems: "center", paddingVertical: space.xl, gap: 4 },
  emptyTitle: { fontFamily: font.bold, fontSize: 16, color: colors.text, marginTop: space.sm },
  emptyText: { fontFamily: font.regular, fontSize: 14, color: colors.muted },
  error: { fontFamily: font.medium, fontSize: 14, color: colors.danger },
});
