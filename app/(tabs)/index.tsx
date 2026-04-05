import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import * as SQLite from "expo-sqlite";
import * as ImagePicker from "expo-image-picker";

const db = SQLite.openDatabaseSync("inventory_pro.db");

export default function App() {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("DESC"); // 'ASC' hoặc 'DESC'

  // Form States
  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    image: null,
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    initDatabase();
    refreshData();
  }, [sortOrder]); // Tải lại khi thay đổi thứ tự sắp xếp

  const initDatabase = () => {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT, category TEXT, price REAL, image TEXT
      );
    `);
  };

  const refreshData = () => {
    const query = `SELECT * FROM products ORDER BY price ${sortOrder}`;
    const allRows = db.getAllSync(query);
    setProducts(allRows);
  };

  const handleSave = () => {
    if (!form.name || !form.price)
      return Alert.alert("Lỗi", "Vui lòng nhập tên và giá");

    if (editingId) {
      db.runSync(
        "UPDATE products SET name = ?, category = ?, price = ?, image = ? WHERE id = ?",
        [
          form.name,
          form.category,
          parseFloat(form.price),
          form.image,
          editingId,
        ],
      );
      setEditingId(null);
    } else {
      db.runSync(
        "INSERT INTO products (name, category, price, image) VALUES (?, ?, ?, ?)",
        [form.name, form.category, parseFloat(form.price), form.image],
      );
    }
    setForm({ name: "", category: "", price: "", image: null });
    refreshData();
  };

  // 1. Chức năng Tìm kiếm & Lọc (Client-side Filter)
  const filteredProducts = useMemo(() => {
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [products, searchQuery]);

  // 2. Chức năng Thống kê theo loại (Group By logic)
  const categoryStats = useMemo(() => {
    const stats = {};
    products.forEach((p) => {
      const cat = p.category || "Khác";
      stats[cat] = (stats[cat] || 0) + p.price;
    });
    return Object.entries(stats);
  }, [products]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) setForm({ ...form, image: result.assets[0].uri });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <Text style={styles.title}>🚀 Quản Lý Kho Hàng</Text>

      {/* 3. Báo cáo nhanh (Dashboard) */}
      <View style={styles.dashboard}>
        <Text style={styles.statTitle}>Phân bổ vốn theo loại:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categoryStats.map(([cat, val]) => (
            <View key={cat} style={styles.statChip}>
              <Text style={styles.chipText}>
                {cat}: {val.toLocaleString()}đ
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Tìm kiếm & Sắp xếp */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchBar}
          placeholder="🔍 Tìm tên hoặc loại..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC")}
        >
          <Text style={{ fontSize: 12 }}>
            Giá {sortOrder === "ASC" ? "▲" : "▼"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Form Nhập liệu */}
      <View style={styles.formCard}>
        <TextInput
          style={styles.input}
          placeholder="Tên SP"
          value={form.name}
          onChangeText={(t) => setForm({ ...form, name: t })}
        />
        <TextInput
          style={styles.input}
          placeholder="Loại SP"
          value={form.category}
          onChangeText={(t) => setForm({ ...form, category: t })}
        />
        <TextInput
          style={styles.input}
          placeholder="Giá"
          keyboardType="numeric"
          value={form.price.toString()}
          onChangeText={(t) => setForm({ ...form, price: t })}
        />

        <View style={styles.formActions}>
          <TouchableOpacity onPress={pickImage} style={styles.imgBtn}>
            <Text>{form.image ? "Đã có ảnh" : "📷 Ảnh"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              {editingId ? "CẬP NHẬT" : "THÊM MỚI"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image
              source={
                item.image
                  ? { uri: item.image }
                  : { uri: "https://via.placeholder.com/50" }
              }
              style={styles.listImg}
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontWeight: "bold" }}>
                {item.name} ({item.category})
              </Text>
              <Text style={{ color: "#27ae60" }}>
                {item.price.toLocaleString()}đ
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setForm(item);
                setEditingId(item.id);
              }}
            >
              <Text style={{ color: "orange" }}>Sửa</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                db.runSync("DELETE FROM products WHERE id = ?", [item.id]);
                refreshData();
              }}
              style={{ marginLeft: 10 }}
            >
              <Text style={{ color: "red" }}>Xóa</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    paddingTop: 50,
    backgroundColor: "#f8f9fa",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 15,
    color: "#2c3e50",
  },
  dashboard: { marginBottom: 15 },
  statTitle: {
    fontSize: 13,
    color: "#7f8c8d",
    marginBottom: 5,
    fontWeight: "600",
  },
  statChip: {
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  chipText: { fontSize: 12, color: "#34495e" },
  searchContainer: { flexDirection: "row", marginBottom: 15 },
  searchBar: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  sortBtn: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    marginLeft: 5,
    borderWidth: 1,
    borderColor: "#ddd",
    justifyContent: "center",
  },
  formCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
    elevation: 5,
  },
  input: {
    borderBottomWidth: 1,
    borderColor: "#eee",
    marginBottom: 12,
    padding: 5,
  },
  formActions: { flexDirection: "row", justifyContent: "space-between" },
  imgBtn: {
    backgroundColor: "#f1f2f6",
    padding: 10,
    borderRadius: 8,
    width: "30%",
    alignItems: "center",
  },
  saveBtn: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 8,
    width: "65%",
    alignItems: "center",
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
    alignItems: "center",
    elevation: 1,
  },
  listImg: { width: 50, height: 50, borderRadius: 8 },
});
