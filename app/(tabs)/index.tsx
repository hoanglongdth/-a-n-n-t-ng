import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Import Firebase logic
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

export default function App() {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("desc"); // 'asc' hoặc 'desc'

  // Form States
  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    image: null,
  });
  const [editingId, setEditingId] = useState(null);

  // Lắng nghe dữ liệu Realtime từ Firestore
  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("price", sortOrder));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const items = [];
      querySnapshot.forEach((doc) => {
        items.push({ ...doc.data(), id: doc.id });
      });
      setProducts(items);
    });

    return () => unsubscribe(); // Tự động đóng kết nối khi thoát ứng dụng
  }, [sortOrder]);

  const handleSave = async () => {
    if (!form.name || !form.price)
      return Alert.alert("Lỗi", "Vui lòng nhập tên và giá");

    try {
      const payload = {
        name: form.name,
        category: form.category || "Chưa phân loại",
        price: parseFloat(form.price),
        image: form.image,
      };

      if (editingId) {
        // Cập nhật Firestore
        const docRef = doc(db, "products", editingId);
        await updateDoc(docRef, payload);
        setEditingId(null);
      } else {
        // Thêm mới vào Firestore
        await addDoc(collection(db, "products"), payload);
      }
      setForm({ name: "", category: "", price: "", image: null });
    } catch (error) {
      Alert.alert("Lỗi Firebase", error.message);
    }
  };

  const handleDelete = (id) => {
    Alert.alert("Xác nhận", "Xóa sản phẩm này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => await deleteDoc(doc(db, "products", id)),
      },
    ]);
  };

  // Tìm kiếm & Lọc (Client-side)
  const filteredProducts = useMemo(() => {
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [products, searchQuery]);

  // Thống kê (Client-side)
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      <Text style={styles.title}>☁️ Inventory Cloud</Text>

      {/* Báo cáo nhanh */}
      <View style={styles.dashboard}>
        <Text style={styles.statTitle}>Vốn theo loại (Realtime):</Text>
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
          placeholder="🔍 Tìm kiếm trên Cloud..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
        >
          <Text style={{ fontSize: 12 }}>
            Giá {sortOrder === "asc" ? "▲" : "▼"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Form Nhập liệu */}
      <View style={styles.formCard}>
        <TextInput
          style={styles.input}
          placeholder="Tên sản phẩm"
          value={form.name}
          onChangeText={(t) => setForm({ ...form, name: t })}
        />
        <TextInput
          style={styles.input}
          placeholder="Danh mục"
          value={form.category}
          onChangeText={(t) => setForm({ ...form, category: t })}
        />
        <TextInput
          style={styles.input}
          placeholder="Giá bán"
          keyboardType="numeric"
          value={form.price.toString()}
          onChangeText={(t) => setForm({ ...form, price: t })}
        />

        <View style={styles.formActions}>
          <TouchableOpacity onPress={pickImage} style={styles.imgBtn}>
            <Text>{form.image ? "✅ Ảnh" : "📷 Ảnh"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              {editingId ? "CẬP NHẬT" : "LƯU LÊN CLOUD"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
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
              <Text style={{ fontWeight: "bold" }}>{item.name}</Text>
              <Text style={{ fontSize: 12, color: "#7f8c8d" }}>
                {item.category}
              </Text>
              <Text style={{ color: "#27ae60", fontWeight: "600" }}>
                {item.price.toLocaleString()}đ
              </Text>
            </View>
            <View style={{ flexDirection: "row" }}>
              <TouchableOpacity
                onPress={() => {
                  setForm({
                    name: item.name,
                    category: item.category,
                    price: item.price.toString(),
                    image: item.image,
                  });
                  setEditingId(item.id);
                }}
              >
                <Text style={{ color: "orange", marginRight: 15 }}>Sửa</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id)}>
                <Text style={{ color: "red" }}>Xóa</Text>
              </TouchableOpacity>
            </View>
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
    backgroundColor: "#f0f2f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 15,
    color: "#1a73e8",
  },
  dashboard: { marginBottom: 15 },
  statTitle: {
    fontSize: 13,
    color: "#5f6368",
    marginBottom: 5,
    fontWeight: "600",
  },
  statChip: {
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#dadce0",
  },
  chipText: { fontSize: 12, color: "#3c4043" },
  searchContainer: { flexDirection: "row", marginBottom: 15 },
  searchBar: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dadce0",
  },
  sortBtn: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    marginLeft: 5,
    borderWidth: 1,
    borderColor: "#dadce0",
    justifyContent: "center",
  },
  formCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    borderBottomWidth: 1,
    borderColor: "#f1f3f4",
    marginBottom: 12,
    padding: 8,
  },
  formActions: { flexDirection: "row", justifyContent: "space-between" },
  imgBtn: {
    backgroundColor: "#e8f0fe",
    padding: 10,
    borderRadius: 8,
    width: "30%",
    alignItems: "center",
  },
  saveBtn: {
    backgroundColor: "#1a73e8",
    padding: 10,
    borderRadius: 8,
    width: "65%",
    alignItems: "center",
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: "center",
    elevation: 1,
  },
  listImg: { width: 55, height: 55, borderRadius: 10 },
});
