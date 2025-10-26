import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import * as Haptics from 'expo-haptics';
import { Analytics } from '../util/analytics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const generateGUID = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

const NotesScreen = () => {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [editingNote, setEditingNote] = useState(null);
  const { theme } = useTheme();

  // Load notes from storage
  const loadNotes = async () => {
    try {
      setIsLoading(true);
      const storedNotes = await AsyncStorage.getItem("notes");
      console.log('Loaded notes from storage:', storedNotes ? JSON.parse(storedNotes).length : 0, 'notes');
      if (storedNotes) {
        const parsedNotes = JSON.parse(storedNotes) || [];
        // Migration: ensure every note has a stable unique id
        const migratedNotes = parsedNotes.map((n) => ({
          ...n,
          id: n && n.id ? n.id : generateGUID(),
        }));
        const hadMissingIds = parsedNotes.some((n) => !n?.id);
        if (hadMissingIds) {
          try {
            await AsyncStorage.setItem("notes", JSON.stringify(migratedNotes));
            console.log('Migrated notes without ids saved.');
          } catch (e) {
            console.error('Failed to persist migrated note ids', e);
          }
        }
        setNotes(migratedNotes);
      } else {
        setNotes([]);
      }
    } catch (error) {
      console.error("Error loading notes", error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [])
  );

  useEffect(() => {
    const saveNotes = async () => {
      try {
        console.log('Saving notes to storage:', notes.length, 'notes');
        await AsyncStorage.setItem("notes", JSON.stringify(notes));
        console.log('Notes saved successfully');
      } catch (error) {
        console.error("Error saving notes", error);
      }
    };
    saveNotes();
  }, [notes]);

  useEffect(() => {
    Analytics.initialize();
    Analytics.trackScreenView('Notes');
  }, []);

  const handleAddNote = () => {
    if (!newNoteText.trim()) return;
    
    console.log('Adding new note');
    
    const newNote = {
      id: generateGUID(),
      text: newNoteText.trim(),
      date: new Date().toISOString(),
    };
    
    // Use functional update to get the most current state
    setNotes((prevNotes) => {
      console.log('Current notes before adding:', prevNotes.length);
      
      const updatedNotes = [newNote, ...prevNotes];
      console.log('Notes after adding:', updatedNotes.length);
      
      // Immediately save to storage to prevent race conditions
      AsyncStorage.setItem("notes", JSON.stringify(updatedNotes))
        .then(() => console.log('Notes saved to storage after adding'))
        .catch((error) => console.error('Error saving notes after adding:', error));
      
      return updatedNotes;
    });
    
    setNewNoteText("");
    setModalVisible(false);
    
    // Haptic feedback for successful creation
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    Analytics.trackEvent && Analytics.trackEvent('add_note', {
      text: newNoteText.trim(),
    });
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setNewNoteText(note.text);
    setModalVisible(true);
  };

  const handleUpdateNote = async () => {
    if (!newNoteText.trim() || !editingNote) return;
    
    console.log('Updating note with id:', editingNote.id);
    console.log('Editing note object:', editingNote);
    console.log('New text:', newNoteText.trim());
    
    // Use functional update to get the most current state
    setNotes((prevNotes) => {
      console.log('Current notes before update:', prevNotes.length);
      console.log('All note IDs:', prevNotes.map(n => n.id));
      
      const updatedNotes = prevNotes.map((note) => {
        console.log(`Comparing note ${note.id} with editingNote ${editingNote.id}:`, note.id === editingNote.id);
        return note.id === editingNote.id
          ? { ...note, text: newNoteText.trim() }
          : note;
      });
      
      console.log('Notes after update:', updatedNotes.length);
      console.log('Updated note texts:', updatedNotes.map(n => n.text));
      
      // Immediately save to storage to prevent race conditions
      AsyncStorage.setItem("notes", JSON.stringify(updatedNotes))
        .then(() => console.log('Notes saved to storage after update'))
        .catch((error) => console.error('Error saving notes after update:', error));
      
      return updatedNotes;
    });
    
    setNewNoteText("");
    setEditingNote(null);
    setModalVisible(false);
    
    // Haptic feedback for successful update
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    Analytics.trackEvent && Analytics.trackEvent('edit_note', {
      id: editingNote.id,
      text: newNoteText.trim(),
    });
  };

  const handleDeleteNote = (id) => {
    Alert.alert(
      "Delete Note",
      "Are you sure you want to delete this note?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            console.log('Deleting note with id:', id);
            
            // Use functional update to get the most current state
            setNotes((prevNotes) => {
              console.log('Current notes before deletion:', prevNotes.length);
              
              const filteredNotes = prevNotes.filter((note) => note.id !== id);
              console.log('Notes after filtering:', filteredNotes.length);
              
              // Immediately save to storage to prevent race conditions
              AsyncStorage.setItem("notes", JSON.stringify(filteredNotes))
                .then(() => console.log('Notes saved to storage after deletion'))
                .catch((error) => console.error('Error saving notes after deletion:', error));
              
              return filteredNotes;
            });
            
            // Haptic feedback for deletion
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            
            Analytics.trackEvent && Analytics.trackEvent('delete_note', {
              id,
            });
          },
        },
      ]
    );
  };

  const handleOpenModal = () => {
    setEditingNote(null);
    setNewNoteText("");
    setModalVisible(true);
    
    // Light haptic feedback for opening modal
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingNote(null);
    setNewNoteText("");
  };

  const renderNoteItem = ({ item }) => (
    <View style={[styles.noteItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <Text style={[styles.noteText, { color: theme.colors.text }]}>{item.text}</Text>
      <Text style={[styles.noteDate, { color: theme.colors.textSecondary }]}>
        {new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
      <View style={styles.noteActions}>
        <TouchableOpacity
          onPress={() => handleEditNote(item)}
          style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
        >
          <Ionicons name="pencil" size={16} color={theme.colors.buttonText} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDeleteNote(item.id)}
          style={[styles.actionButton, { backgroundColor: theme.colors.error }]}
        >
          <Ionicons name="trash" size={16} color={theme.colors.buttonText} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {isLoading ? (
        <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading...</Text>
        </View>
      ) : notes.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: theme.colors.background }]}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="document-text-outline" size={60} color={theme.colors.primary} />
          </View>
          <Text style={[styles.emptyText, { color: theme.colors.text }]}>No notes yet</Text>
          <Text style={[styles.emptySubText, { color: theme.colors.textSecondary }]}>
            Tap the + button to create your first note
          </Text>
          <TouchableOpacity 
            style={[styles.emptyActionButton, { backgroundColor: theme.colors.button }]}
            onPress={handleOpenModal}
          >
            <Ionicons name="add" size={20} color={theme.colors.buttonText} />
            <Text style={[styles.emptyActionText, { color: theme.colors.buttonText }]}>Create Note</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={notes}
            keyExtractor={(item, index) => item?.id ?? `${item?.date ?? 'unknown'}-${index}`}
            renderItem={renderNoteItem}
            contentContainerStyle={[styles.listContainer, { backgroundColor: theme.colors.background }]}
          />
          {/* Floating Button to Add New Note */}
          <TouchableOpacity
            onPress={handleOpenModal}
            style={[styles.floatingButton, { backgroundColor: theme.colors.button }]}
          >
            <Ionicons name="add" size={20} color={theme.colors.buttonText} style={{ marginRight: 8 }} />
            <Text style={[styles.floatingButtonText, { color: theme.colors.buttonText }]}>Add Note</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Modal for creating/editing a note */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={handleCloseModal}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.modalBackground, borderColor: theme.colors.border }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {editingNote ? "Edit Note" : "Create New Note"}
            </Text>
            <TextInput
              placeholder="Enter your note..."
              placeholderTextColor={theme.colors.textLight}
              value={newNoteText}
              onChangeText={setNewNoteText}
              style={[styles.textInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                onPress={handleCloseModal}
                style={[styles.button, { backgroundColor: theme.colors.border }]}
              >
                <Text style={[styles.buttonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={editingNote ? handleUpdateNote : handleAddNote}
                style={[styles.button, { backgroundColor: theme.colors.primary }]}
              >
                <Text style={[styles.buttonText, { color: theme.colors.buttonText }]}>
                  {editingNote ? "Update" : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  listContainer: {
    paddingHorizontal: wp("4%"),
    paddingBottom: wp("20%"),
    paddingTop: wp("8%"),
  },
  noteItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: wp("2%"),
    padding: wp("4%"),
    marginBottom: wp("3%"),
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: wp("1%"),
    elevation: 1,
  },
  noteText: {
    fontSize: wp("3.5%"),
    color: "#2C3E50",
    fontFamily: "monospace",
    marginBottom: wp("2%"),
    lineHeight: wp("4.5%"),
  },
  noteDate: {
    fontSize: wp("2.5%"),
    color: "#7F8C8D",
    fontFamily: "monospace",
    marginBottom: wp("2%"),
  },
  noteActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: wp("2%"),
  },
  actionButton: {
    padding: wp("2%"),
    borderRadius: wp("1%"),
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp("6%"),
    paddingVertical: wp("8%"),
  },
  emptyIconContainer: {
    marginBottom: wp("6%"),
    opacity: 0.7,
  },
  emptyText: {
    fontSize: wp("5.5%"),
    fontWeight: "800",
    color: "#2C3E50",
    marginBottom: wp("2%"),
    fontFamily: "monospace",
    textAlign: "center",
  },
  emptySubText: {
    fontSize: wp("3.5%"),
    color: "#7F8C8D",
    textAlign: "center",
    marginBottom: wp("6%"),
    fontFamily: "monospace",
    lineHeight: wp("5%"),
  },
  emptyActionButton: {
    backgroundColor: "#3498DB",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: wp("4%"),
    paddingHorizontal: wp("8%"),
    borderRadius: wp("3%"),
    marginBottom: wp("6%"),
    shadowColor: "#3498DB",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  emptyActionText: {
    color: "#FFFFFF",
    fontSize: wp("3.8%"),
    fontWeight: "bold",
    fontFamily: "monospace",
    marginLeft: wp("2%"),
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp("6%"),
    paddingVertical: wp("8%"),
  },
  loadingText: {
    fontSize: wp("4%"),
    fontWeight: "600",
    color: "#2C3E50",
    fontFamily: "monospace",
  },
  floatingButton: {
    position: "absolute",
    bottom: wp("4%"),
    right: wp("4%"),
    backgroundColor: "#3498DB",
    flexDirection: "row",
    alignItems: "center",
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
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: wp("4%"),
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: wp("2%"),
    padding: wp("4%"),
    elevation: 5,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  modalTitle: {
    fontSize: wp("4%"),
    fontWeight: "bold",
    marginBottom: wp("2.5%"),
    textAlign: "center",
    color: "#2C3E50",
    fontFamily: "monospace",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    padding: wp("3%"),
    marginBottom: wp("2.5%"),
    borderRadius: wp("1%"),
    color: "#2C3E50",
    fontFamily: "monospace",
    fontSize: wp("3%"),
    backgroundColor: "#FFFFFF",
    minHeight: wp("20%"),
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  button: {
    flex: 1,
    padding: wp("2%"),
    borderRadius: wp("1%"),
    alignItems: "center",
    marginHorizontal: wp("1%"),
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: wp("3%"),
    fontFamily: "monospace",
  },
});

export default NotesScreen;
