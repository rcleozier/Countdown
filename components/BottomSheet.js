import React, { useEffect, useRef } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Dimensions,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const BottomSheet = ({
  visible,
  onClose,
  children,
  title,
  height = '70%',
  showHandle = true,
}) => {
  const { theme, isDark } = useTheme();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropOpacity]);

  const sheetHeight = typeof height === 'string' 
    ? (parseFloat(height) / 100) * SCREEN_HEIGHT 
    : height;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        activeOpacity={1}
      >
        <Animated.View
          style={[
            styles.backdropOverlay,
            {
              opacity: backdropOpacity,
            }
          ]}
        />
      </Pressable>

      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
            height: sheetHeight,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        {showHandle && (
          <View style={styles.handleContainer}>
            <View style={[
              styles.handle,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }
            ]} />
          </View>
        )}

        {title && (
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={[
                styles.closeButton,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                }
              ]}>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons
                    name="close"
                    size={20}
                    color={isDark ? '#A1A1A1' : '#6B7280'}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.titleContainer}>
                <Text style={[
                  styles.title,
                  { color: isDark ? '#F5F5F5' : '#111111' }
                ]}>
                  {title}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.content}>
          {children}
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdropOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: wp('2%'),
    paddingBottom: wp('1%'),
  },
  handle: {
    width: wp('12%'),
    height: 4,
    borderRadius: 2,
  },
  header: {
    paddingHorizontal: wp('5%'),
    paddingTop: wp('3%'),
    paddingBottom: wp('2%'),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    width: wp('10%'),
    height: wp('10%'),
    borderRadius: wp('5%'),
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    marginLeft: wp('3%'),
  },
  title: {
    fontSize: wp('5%'),
    fontWeight: '600',
    fontFamily: 'System',
  },
  content: {
    flex: 1,
    padding: wp('5%'),
  },
});

export default BottomSheet;

