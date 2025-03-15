import { AsyncStorage } from "react-native";

const setItem = async (key, value) => {
  try {
    return await AsyncStorage.setItem(key, value);
  } catch (error) {
    // Error saving data
    console.log(error);
  }
};

const getItem = async (key) => {
  try {
    return await AsyncStorage.getItem(key);
  } catch (error) {
    // Error saving data
    console.log(error);
  }
};

const removeItem = async (key) => {
  try {
    return await AsyncStorage.removeItem(key);
  } catch (error) {
    // Error saving data
    console.log(error);
  }
};

const getAllKeys = async () => {
  try {
    return await AsyncStorage.getAllKeys();
  } catch (error) {
    // Error saving data
    console.log(error);
  }
};

export { setItem, getItem, getAllKeys, removeItem };
