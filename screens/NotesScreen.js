import React, { useState, useCallback, useEffect, useRef } from "react";
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
  ScrollView,
  Animated,
  Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import * as Haptics from 'expo-haptics';
import { Analytics } from '../util/analytics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

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
  const [inputFocused, setInputFocused] = useState(false);
  const { theme, isDark } = useTheme();
  
  // Modal animation ref
  const modalScale = useRef(new Animated.Value(0.95)).current;
  
  // Empty state animation refs
  const emptyIconScale = useRef(new Animated.Value(0.95)).current;
  const emptyIconOpacity = useRef(new Animated.Value(0)).current;
  const emptyTextOpacity = useRef(new Animated.Value(0)).current;
  const emptySubTextOpacity = useRef(new Animated.Value(0)).current;
  const emptyButtonScale = useRef(new Animated.Value(1)).current;
  const emptyButtonOpacity = useRef(new Animated.Value(0)).current;

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

  // Modal animation
  useEffect(() => {
    if (modalVisible) {
      Animated.spring(modalScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      modalScale.setValue(0.95);
    }
  }, [modalVisible]);

  // Empty state animation
  useEffect(() => {
    if (notes.length === 0 && !isLoading) {
      // Icon animation
      Animated.parallel([
        Animated.spring(emptyIconScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(emptyIconOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Text animations (sequential)
      setTimeout(() => {
        Animated.timing(emptyTextOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }, 100);
      
      setTimeout(() => {
        Animated.timing(emptySubTextOpacity, {
          toValue: 0.85, // 85% opacity
          duration: 200,
          useNativeDriver: true,
        }).start();
      }, 200);
      
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(emptyButtonOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.spring(emptyButtonScale, {
            toValue: 1,
            useNativeDriver: true,
          }),
        ]).start();
      }, 300);
    } else {
      // Reset animations
      emptyIconScale.setValue(0.95);
      emptyIconOpacity.setValue(0);
      emptyTextOpacity.setValue(0);
      emptySubTextOpacity.setValue(0);
      emptyButtonOpacity.setValue(0);
      emptyButtonScale.setValue(1);
    }
  }, [notes.length, isLoading]);

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

  const NoteItem = ({ item, onEdit, onDelete, isDark }) => {
    const cardScale = useRef(new Animated.Value(1)).current;
    const editButtonScale = useRef(new Animated.Value(1)).current;
    const editButtonOpacity = useRef(new Animated.Value(1)).current;
    const deleteButtonScale = useRef(new Animated.Value(1)).current;
    const deleteButtonOpacity = useRef(new Animated.Value(1)).current;

    const handleCardPressIn = () => {
      Animated.spring(cardScale, {
        toValue: 0.98,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();
    };

    const handleCardPressOut = () => {
      Animated.spring(cardScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();
    };

    const handleEditPressIn = () => {
      Animated.parallel([
        Animated.spring(editButtonScale, {
          toValue: 0.95,
          useNativeDriver: true,
        }),
        Animated.timing(editButtonOpacity, {
          toValue: 0.93, // Brighten 6-8% (opacity increase)
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    };

    const handleEditPressOut = () => {
      Animated.parallel([
        Animated.spring(editButtonScale, {
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(editButtonOpacity, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    };

    const handleDeletePressIn = () => {
      Animated.parallel([
        Animated.spring(deleteButtonScale, {
          toValue: 0.95,
          useNativeDriver: true,
        }),
        Animated.timing(deleteButtonOpacity, {
          toValue: 0.93, // Brighten 6-8% (opacity increase)
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    };

    const handleDeletePressOut = () => {
      Animated.parallel([
        Animated.spring(deleteButtonScale, {
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(deleteButtonOpacity, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    };

    return (
      <Pressable
        onPressIn={handleCardPressIn}
        onPressOut={handleCardPressOut}
      >
        <Animated.View style={[
          styles.noteItem,
          {
            backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
            shadowColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)',
            borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'transparent',
            transform: [{ scale: cardScale }],
          }
        ]}>
          <Text 
            style={[
              styles.noteText,
              { color: isDark ? '#F3F4F6' : '#111827' }
            ]}
            numberOfLines={3}
            ellipsizeMode="tail"
          >
            {item.text}
          </Text>
          <Text style={[
            styles.noteDate,
            { color: isDark ? '#A1A1A1' : '#6B7280' }
          ]}>
            {new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <View style={styles.noteActions}>
            <Pressable
              onPressIn={handleEditPressIn}
              onPressOut={handleEditPressOut}
              onPress={() => onEdit(item)}
            >
              <Animated.View style={[
                styles.actionButton,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6',
                  transform: [{ scale: editButtonScale }],
                  opacity: editButtonOpacity,
                }
              ]}>
                <Ionicons name="pencil" size={wp('4.8%')} color="#4E9EFF" />
              </Animated.View>
            </Pressable>
            <Pressable
              onPressIn={handleDeletePressIn}
              onPressOut={handleDeletePressOut}
              onPress={() => onDelete(item.id)}
            >
              <Animated.View style={[
                styles.actionButton,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6',
                  transform: [{ scale: deleteButtonScale }],
                  opacity: deleteButtonOpacity,
                }
              ]}>
                <Ionicons name="trash" size={wp('4.8%')} color="#E15747" />
              </Animated.View>
            </Pressable>
          </View>
        </Animated.View>
      </Pressable>
    );
  };

  const renderNoteItem = ({ item }) => (
    <NoteItem 
      item={item} 
      onEdit={handleEditNote} 
      onDelete={handleDeleteNote}
      isDark={isDark}
    />
  );

  const floatingButtonScale = useRef(new Animated.Value(1)).current;
  const floatingButtonOpacity = useRef(new Animated.Value(1)).current;

  const handleFloatingButtonPressIn = () => {
    Animated.parallel([
      Animated.spring(floatingButtonScale, {
        toValue: 1.02,
        useNativeDriver: true,
      }),
      Animated.timing(floatingButtonOpacity, {
        toValue: 0.92, // Lighten 8%
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleFloatingButtonPressOut = () => {
    Animated.parallel([
      Animated.spring(floatingButtonScale, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(floatingButtonOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const backgroundGradient = isDark 
    ? ['#121212', '#1C1C1C']
    : ['#F9FAFB', '#FFFFFF'];

  return (
    <LinearGradient colors={backgroundGradient} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: isDark ? '#F5F5F5' : '#111827' }]}>Loading...</Text>
          </View>
        ) : notes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Animated.View style={[
              styles.emptyIconContainer,
              {
                backgroundColor: isDark ? 'rgba(78,158,255,0.15)' : 'rgba(78,158,255,0.08)',
                transform: [{ scale: emptyIconScale }],
                opacity: emptyIconOpacity,
              }
            ]}>
              <Ionicons 
                name="document-text-outline" 
                size={wp('14%')} // ~52px to match HomeScreen padding
                color={isDark ? '#4E9EFF' : '#4A9EFF'} 
              />
            </Animated.View>
            <Animated.View style={{ opacity: emptyTextOpacity }}>
              <Text style={[
                styles.emptyText,
                { color: isDark ? '#F3F4F6' : '#111111' }
              ]}>No notes yet</Text>
            </Animated.View>
            <Animated.View style={{ opacity: emptySubTextOpacity }}>
              <Text style={[styles.emptySubText, { color: isDark ? '#A1A1A1' : '#6B7280' }]}>
                Tap the + button to create your first note
              </Text>
            </Animated.View>
            <Pressable
              onPressIn={() => {
                Animated.parallel([
                  Animated.spring(emptyButtonScale, {
                    toValue: 1.02,
                    useNativeDriver: true,
                  }),
                  Animated.timing(emptyButtonOpacity, {
                    toValue: 0.92, // Lighten 8%
                    duration: 150,
                    useNativeDriver: true,
                  }),
                ]).start();
              }}
              onPressOut={() => {
                Animated.parallel([
                  Animated.spring(emptyButtonScale, {
                    toValue: 1,
                    useNativeDriver: true,
                  }),
                  Animated.timing(emptyButtonOpacity, {
                    toValue: 1,
                    duration: 150,
                    useNativeDriver: true,
                  }),
                ]).start();
              }}
              onPress={handleOpenModal}
            >
              <Animated.View style={[
                styles.emptyActionButton,
                {
                  backgroundColor: isDark ? '#3C82F6' : '#4E9EFF',
                  shadowColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)',
                  transform: [{ scale: emptyButtonScale }],
                  opacity: emptyButtonOpacity,
                }
              ]}>
                <Ionicons name="add" size={wp('5%')} color="#FFFFFF" style={{ marginRight: wp('2%') }} />
                <Text style={styles.emptyActionText}>Create Note</Text>
              </Animated.View>
            </Pressable>
          </View>
        ) : (
          <>
            <FlatList
              data={notes}
              keyExtractor={(item, index) => item?.id ?? `${item?.date ?? 'unknown'}-${index}`}
              renderItem={renderNoteItem}
              contentContainerStyle={styles.listContainer}
            />
            {/* Floating Button to Add New Note */}
            <Pressable
              onPressIn={handleFloatingButtonPressIn}
              onPressOut={handleFloatingButtonPressOut}
              onPress={handleOpenModal}
            >
              <Animated.View style={[
                styles.floatingButton,
                {
                  backgroundColor: isDark ? '#3C82F6' : '#4E9EFF',
                  shadowColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)',
                  transform: [{ scale: floatingButtonScale }],
                  opacity: floatingButtonOpacity,
                }
              ]}>
                <Ionicons name="add" size={wp('5%')} color="#FFFFFF" style={{ marginRight: wp('2%') }} />
                <Text style={styles.floatingButtonText}>Add Note</Text>
              </Animated.View>
            </Pressable>
          </>
        )}

      {/* Modal for creating/editing a note */}
      <Modal
        animationType="fade"
        transparent
        visible={modalVisible}
        onRequestClose={handleCloseModal}
      >
        <View style={[
          styles.modalContainer,
          { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.25)' }
        ]}>
          <Animated.View style={[
            styles.modalContent,
            {
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              shadowColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)',
              transform: [{ scale: modalScale }],
            }
          ]}>
            <ScrollView 
              style={styles.modalFormScroll}
              contentContainerStyle={styles.modalFormContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[
                styles.modalTitle,
                { color: isDark ? '#F5F5F5' : '#111111' }
              ]}>
                {editingNote ? "Edit Note" : "Create New Note"}
              </Text>
              <TextInput
                placeholder="Enter your note..."
                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                value={newNoteText}
                onChangeText={setNewNoteText}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDark ? '#2B2B2B' : '#F9FAFB',
                    borderColor: inputFocused 
                      ? (isDark ? '#4E9EFF' : '#4A9EFF')
                      : (isDark ? 'rgba(255,255,255,0.05)' : '#E5E7EB'),
                    color: isDark ? '#F5F5F5' : '#111111',
                  }
                ]}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                onPress={handleCloseModal}
                style={[
                  styles.button,
                  {
                    backgroundColor: isDark ? '#2E2E2E' : '#F3F4F6',
                  }
                ]}
              >
                <Text style={[
                  styles.buttonText,
                  { color: isDark ? '#E5E7EB' : '#111111' }
                ]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={editingNote ? handleUpdateNote : handleAddNote}
                style={[
                  styles.button,
                  {
                    backgroundColor: isDark ? '#3CC4A2' : '#4E9EFF',
                    shadowColor: isDark ? '#3CC4A2' : '#4E9EFF',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 4,
                  }
                ]}
              >
                <Text style={styles.buttonTextSave}>
                  {editingNote ? "Update" : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: wp("5%"), // 20-24px
    paddingBottom: wp("20%"),
    paddingTop: wp("3%"),
  },
  noteItem: {
    borderRadius: wp('3.5%'), // 12-14px
    padding: wp('4.5%'), // 16-18px
    marginBottom: wp('3.5%'), // 14-16px vertical gap
    borderWidth: 0, // No visible border in light mode
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  noteText: {
    fontSize: wp('4.25%'), // 16-17px
    fontWeight: '400', // Regular/medium
    fontFamily: 'System',
    marginBottom: wp('1.5%'), // 6px spacing from timestamp
    lineHeight: wp('5.5%'),
  },
  noteDate: {
    fontSize: wp('3.5%'), // 13-14px
    fontWeight: '500', // Medium
    fontFamily: 'System',
    marginBottom: wp('2%'),
  },
  noteActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: wp('2.5%'), // 8-10px between buttons
    marginTop: wp('1%'),
  },
  actionButton: {
    width: wp('8%'), // 32px circular
    height: wp('8%'),
    borderRadius: wp('4%'), // Circular
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp("6%"), // 24px
    paddingVertical: wp("8%"),
  },
  emptyIconContainer: {
    width: wp('20%'), // ~75px to match HomeScreen
    height: wp('20%'),
    borderRadius: wp('10%'), // Circular
    alignItems: "center",
    justifyContent: "center",
    marginBottom: wp("5%"), // 20-24px spacing
  },
  emptyText: {
    fontSize: wp("4.5%"), // 18px
    fontWeight: "600", // Semibold
    marginBottom: wp("2.5%"), // 8-10px bottom margin
    fontFamily: "System",
    textAlign: "center",
  },
  emptySubText: {
    fontSize: wp("3.5%"), // 14px
    textAlign: "center",
    marginBottom: wp("4%"), // 16px bottom spacing before button
    fontFamily: "System",
    lineHeight: wp("4.5%"),
  },
  emptyActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: wp('11%'), // 44-48px
    paddingVertical: wp("3%"),
    paddingHorizontal: wp("6%"),
    borderRadius: wp('3.5%'), // 12-14px
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyActionText: {
    color: "#FFFFFF",
    fontSize: wp("3.5%"),
    fontWeight: "600", // Semibold
    fontFamily: "System",
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
    fontFamily: "System",
  },
  floatingButton: {
    position: "absolute",
    bottom: wp("4%"),
    right: wp("4%"),
    flexDirection: "row",
    alignItems: "center",
    height: wp('11%'), // 44-48px
    paddingVertical: wp("3%"),
    paddingHorizontal: wp("5%"),
    borderRadius: wp('3%'), // 12px
    zIndex: 999,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingButtonText: {
    color: "#FFFFFF",
    fontSize: wp('3.5%'),
    fontWeight: "600", // Semibold
    fontFamily: "System",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: wp("5%"),
  },
  modalContent: {
    width: '100%',
    maxWidth: wp('90%'),
    maxHeight: hp('75%'),
    borderRadius: wp('4%'), // 16px
    paddingHorizontal: wp('4%'),
    paddingTop: wp('3.5%'),
    paddingBottom: wp('2.5%'),
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  modalFormScroll: {
    maxHeight: hp('55%'),
  },
  modalFormContent: {
    paddingBottom: wp('1%'),
  },
  modalTitle: {
    fontSize: wp('4.25%'), // Even smaller
    fontWeight: '600', // Semibold
    fontFamily: 'System',
    marginBottom: wp('2%'), // Even more reduced
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: wp('2.5%'), // 10px
    padding: wp('3%'),
    marginBottom: wp('2%'),
    fontSize: wp('3.5%'), // Slightly smaller
    fontWeight: '500', // Medium
    fontFamily: 'System',
    minHeight: wp('20%'),
    width: '100%',
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: wp('2.5%'), // 8-10px gap
    marginTop: wp('2%'), // Better spacing
    flexShrink: 0, // Prevent shrinking
  },
  button: {
    flex: 1,
    height: wp('10%'), // Better height
    borderRadius: wp('3%'), // 10-12px
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: wp('2.5%'),
    paddingHorizontal: wp('2%'),
  },
  buttonText: {
    fontWeight: "600", // Semibold
    fontSize: wp('4%'), // 15-16px
    fontFamily: "System",
  },
  buttonTextSave: {
    color: "#FFFFFF",
    fontWeight: "600", // Semibold
    fontSize: wp('4%'), // 15-16px
    fontFamily: "System",
  },
});

export default NotesScreen;
