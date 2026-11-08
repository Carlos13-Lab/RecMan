import { Tabs } from "expo-router";
import { useState } from "react";
import { QuickSaleSheet } from "../../src/features/sales/QuickSaleSheet";
import { TabBar } from "../../src/ui/TabBar";

export default function TabsLayout() {
  const [saleOpen, setSaleOpen] = useState(false);
  return (
    <>
      <Tabs screenOptions={{ headerShown: false }} tabBar={(p) => <TabBar {...p} onAdd={() => setSaleOpen(true)} />}>
        <Tabs.Screen name="index" options={{ title: "Inicio" }} />
        <Tabs.Screen name="recipes" options={{ title: "Recetas" }} />
        <Tabs.Screen name="sales" options={{ title: "Ventas" }} />
        <Tabs.Screen name="inventory" options={{ title: "Inventario" }} />
      </Tabs>
      <QuickSaleSheet visible={saleOpen} onClose={() => setSaleOpen(false)} />
    </>
  );
}
