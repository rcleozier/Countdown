import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, SafeAreaView, Modal } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import { Ionicons } from '@expo/vector-icons';
import { Analytics } from '../util/analytics';
import OptimizedBannerAd from '../components/Ads';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';

const NOTES_KEY = "notes";

const NotesScreen = () => {
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    Analytics.initialize();
    Analytics.trackScreenView('Notes');
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
    const newNote = { text: noteText.trim(), date: new Date().toISOString() };
    const newNotes = [...notes, newNote];
    saveNotes(newNotes);
    setNoteText("");
    setModalVisible(false);
    
    // Haptic feedback for successful note creation
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    Analytics.trackEvent && Analytics.trackEvent('add_note', newNote);
  };

  const deleteNote = (idx) => {
    Alert.alert("Delete Note", "Are you sure you want to delete this note?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => {
        const noteToDelete = notes[idx];
        const newNotes = notes.filter((_, i) => i !== idx);
        saveNotes(newNotes);
        
        // Haptic feedback for note deletion
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        
        Analytics.trackEvent && Analytics.trackEvent('delete_note', noteToDelete);
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

  // Prepare data with ad at the bottom
  let listData = [];
  if (notes.length > 0) {
    // Sort notes by date descending (newest first)
    const sortedNotes = [...notes].sort((a, b) => new Date(b.date) - new Date(a.date));
    listData = [...sortedNotes.map((note) => ({ ...note, type: 'note', key: note.date })), { type: 'ad', key: 'ad' }];
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <FlatList
          data={listData}
          keyExtractor={(item) => item.key}
          renderItem={({ item, index }) => {
            if (item.type === 'ad') {
              return <OptimizedBannerAd />;
            }
            // Find the correct index in the notes array by date
            const noteIdx = notes.findIndex(n => n.date === item.date);
            return (
              <View style={[styles.noteCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Text style={[styles.noteText, { color: theme.colors.text }]}>{item.text}</Text>
                <Text style={[styles.noteDate, { color: theme.colors.textSecondary }]}>
                  Created: {new Date(item.date).toLocaleDateString()} at {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <View style={styles.noteActions}>
                  <TouchableOpacity onPress={() => startEdit(noteIdx)} style={[styles.iconButton, { backgroundColor: theme.colors.buttonSecondary }]}>
                    <Ionicons name="pencil" size={20} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteNote(noteIdx)} style={[styles.iconButton, { backgroundColor: theme.colors.buttonSecondary }]}>
                    <Ionicons name="trash" size={20} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View>
              <Text style={[styles.emptyText, { color: theme.colors.text }]}>No notes yet.</Text>
              <OptimizedBannerAd />
            </View>
          }
          contentContainerStyle={[styles.listContainer, { backgroundColor: theme.colors.background }]}
        />
        <TouchableOpacity
          style={[styles.addNoteButton, { backgroundColor: theme.colors.button }]}
          onPress={() => {
            // Light haptic feedback for opening modal
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            
            setEditingIndex(null);
            setNoteText("");
            setModalVisible(true);
          }}
        >
          <Text style={[styles.addNoteButtonText, { color: theme.colors.buttonText }]}>+ Add New Note</Text>
        </TouchableOpacity>
        <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
          <View style={[styles.modalOverlay, { backgroundColor: theme.colors.modalOverlay }]}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.modalBackground, borderColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{editingIndex !== null ? "Edit Note" : "Add Note"}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                value={noteText}
                onChangeText={setNoteText}
                maxLength={300}
                multiline
                placeholder="Write your note (max 300 chars)"
                placeholderTextColor={theme.colors.textLight}
              />
              <Text style={[styles.charCount, { color: theme.colors.textSecondary }]}>{noteText.length}/300</Text>
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.button, { backgroundColor: theme.colors.border }]}>
                  <Text style={[styles.buttonText, { color: theme.colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={editingIndex !== null ? saveEdit : addNote} style={[styles.button, { backgroundColor: theme.colors.primary }] }>
                  <Text style={[styles.buttonText, { color: theme.colors.buttonText }]}>{editingIndex !== null ? "Save" : "Add"}</Text>
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
    fontSize: wp('5%'), 
    fontWeight: 'bold', 
    color: '#3498DB', 
    marginBottom: wp('4%'), 
    textAlign: 'center',
    marginTop: wp('8%'),
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  listContainer: {
    paddingHorizontal: wp('4%'),
    paddingBottom: wp('20%'),
    paddingTop: wp('8%'),
  },
  noteCard: { 
    backgroundColor: '#FFF', 
    borderRadius: wp('3%'), 
    padding: wp('4%'), 
    marginBottom: wp('3%'), 
    borderWidth: 1, 
    borderColor: '#E0E0E0', 
    shadowColor: '#000', 
    shadowOpacity: 0.07, 
    shadowRadius: wp('2%'), 
    elevation: 2,
  },
  noteText: { 
    fontSize: wp('4%'), 
    color: '#2C3E50', 
    marginBottom: wp('2%'),
    lineHeight: wp('6%'),
    fontFamily: 'monospace',
  },
  noteDate: {
    fontSize: wp('2.7%'),
    color: '#7F8C8D',
    marginBottom: wp('2.5%'),
    fontStyle: 'italic',
    fontFamily: 'monospace',
  },
  noteActions: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end',
    marginTop: wp('1%'),
  },
  iconButton: {
    marginLeft: wp('3%'),
    padding: wp('1.5%'),
    borderRadius: wp('2%'),
    backgroundColor: '#F4F8FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { 
    color: '#7F8C8D', 
    textAlign: 'center', 
    marginTop: wp('10%'), 
    fontSize: wp('3%'),
    fontFamily: 'monospace',
  },
  addNoteButton: {
    position: 'absolute',
    bottom: wp('4%'),
    right: wp('4%'),
    backgroundColor: '#0099F7',
    paddingVertical: wp('3%'),
    paddingHorizontal: wp('4%'),
    borderRadius: wp('2%'),
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: wp('2%'),
    elevation: 3,
  },
  addNoteButtonText: {
    color: '#FFFFFF',
    fontSize: wp('3%'),
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: wp("2%"),
    padding: wp("4%"),
    elevation: 5,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    width: '90%',
  },
  modalTitle: {
    fontSize: wp("4%"),
    fontWeight: "bold",
    marginBottom: wp("2.5%"),
    textAlign: "center",
    color: "#2C3E50",
    fontFamily: "monospace",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    padding: wp("2%"),
    marginBottom: wp("2.5%"),
    borderRadius: wp("1%"),
    color: "#2C3E50",
    fontFamily: "monospace",
    fontSize: wp("3%"),
    backgroundColor: "#FFFFFF",
    minHeight: wp('16%'),
    textAlignVertical: 'top',
  },
  charCount: {
    alignSelf: 'flex-end',
    color: '#888',
    fontSize: wp('2.5%'),
    marginBottom: wp('2%'),
    fontFamily: 'monospace',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: wp('2%'),
  },
  button: {
    flex: 1,
    padding: wp('2%'),
    borderRadius: wp('1%'),
    alignItems: 'center',
    marginHorizontal: wp('1%'),
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: wp('3%'),
    fontFamily: 'monospace',
  },

});

export default NotesScreen; 