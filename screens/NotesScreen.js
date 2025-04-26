import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, SafeAreaView, Modal } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";

const NOTES_KEY = "notes";

const NotesScreen = () => {
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const stored = await AsyncStorage.getItem(NOTES_KEY);
      if (stored) setNotes(JSON.parse(stored));
    } catch (e) { console.error(e); }
  };

  const saveNotes = async (newNotes) => {
    setNotes(newNotes);
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(newNotes));
  };

  const addNote = () => {
    if (!noteText.trim()) return;
    if (noteText.length > 300) {
      Alert.alert("Note too long", "Notes must be 300 characters or less.");
      return;
    }
    const newNotes = [...notes, { text: noteText.trim(), date: new Date().toISOString() }];
    saveNotes(newNotes);
    setNoteText("");
    setModalVisible(false);
  };

  const deleteNote = (idx) => {
    Alert.alert("Delete Note", "Are you sure you want to delete this note?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => {
        const newNotes = notes.filter((_, i) => i !== idx);
        saveNotes(newNotes);
      }}
    ]);
  };

  const startEdit = (idx) => {
    setEditingIndex(idx);
    setNoteText(notes[idx].text);
    setModalVisible(true);
  };

  const saveEdit = () => {
    if (!noteText.trim()) return;
    if (noteText.length > 300) {
      Alert.alert("Note too long", "Notes must be 300 characters or less.");
      return;
    }
    const newNotes = notes.map((n, i) => i === editingIndex ? { ...n, text: noteText.trim() } : n);
    saveNotes(newNotes);
    setEditingIndex(null);
    setNoteText("");
    setModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.header}>Notes</Text>
        <FlatList
          data={notes}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item, index }) => (
            <View style={styles.noteCard}>
              <Text style={styles.noteText}>{item.text}</Text>
              <Text style={styles.noteDate}>
                Created: {new Date(item.date).toLocaleDateString()} at {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <View style={styles.noteActions}>
                <TouchableOpacity onPress={() => startEdit(index)} style={styles.actionButton}>
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteNote(index)} style={styles.actionButton}>
                  <Text style={[styles.actionText, { color: '#E74C3C' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No notes yet.</Text>}
          contentContainerStyle={styles.listContainer}
        />
        <TouchableOpacity 
          style={styles.floatingButton} 
          onPress={() => { 
            setEditingIndex(null); 
            setNoteText(""); 
            setModalVisible(true); 
          }}
        >
          <Text style={styles.floatingButtonText}>+ Add Note</Text>
        </TouchableOpacity>
        <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{editingIndex !== null ? "Edit Note" : "Add Note"}</Text>
              <TextInput
                style={styles.input}
                value={noteText}
                onChangeText={setNoteText}
                maxLength={300}
                multiline
                placeholder="Write your note (max 300 chars)"
              />
              <Text style={styles.charCount}>{noteText.length}/300</Text>
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalButton}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={editingIndex !== null ? saveEdit : addNote} style={[styles.modalButton, { backgroundColor: '#3498DB' }] }>
                  <Text style={[styles.modalButtonText, { color: '#FFF' }]}>{editingIndex !== null ? "Save" : "Add"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { flex: 1 },
  header: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#3498DB', 
    marginBottom: 18, 
    textAlign: 'center',
    marginTop: 20
  },
  listContainer: {
    padding: 20,
    paddingBottom: 80
  },
  noteCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 10, 
    padding: 16, 
    marginBottom: 14, 
    borderWidth: 1, 
    borderColor: '#E0E0E0', 
    shadowColor: '#000', 
    shadowOpacity: 0.07, 
    shadowRadius: 4, 
    elevation: 2 
  },
  noteText: { 
    fontSize: 18, 
    color: '#2C3E50', 
    marginBottom: 8,
    lineHeight: 24
  },
  noteDate: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 12,
    fontStyle: 'italic'
  },
  noteActions: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end' 
  },
  actionButton: { 
    marginLeft: 18 
  },
  actionText: { 
    color: '#3498DB', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  emptyText: { 
    color: '#7F8C8D', 
    textAlign: 'center', 
    marginTop: 40, 
    fontSize: 16 
  },
  floatingButton: {
    position: "absolute",
    bottom: wp("4%"),
    right: wp("4%"),
    backgroundColor: "#3498DB",
    paddingVertical: wp("3%"),
    paddingHorizontal: wp("4%"),
    borderRadius: wp("2%"),
    zIndex: 999,
  },
  floatingButtonText: {
    color: "#FFFFFF",
    fontSize: wp("3%"),
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.15)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFF', borderRadius: 12, padding: 24, width: '90%', elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#3498DB', marginBottom: 12, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 12, minHeight: 80, fontSize: 16, color: '#2C3E50', backgroundColor: '#F8F9FA' },
  charCount: { alignSelf: 'flex-end', color: '#7F8C8D', fontSize: 13, marginTop: 4 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 18 },
  modalButton: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8, backgroundColor: '#EEE', marginLeft: 10 },
  modalButtonText: { color: '#3498DB', fontWeight: 'bold', fontSize: 16 },
});

export default NotesScreen; 