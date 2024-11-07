import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform, Alert } from 'react-native';

type DeviceType = Device & {
  name: string;
  rssi: number;
};

const BluetoothPage: React.FC = () => {
  const [bleManager] = useState<BleManager>(new BleManager());
  const [devices, setDevices] = useState<DeviceType[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<DeviceType | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    requestPermissions();

    return () => {
      bleManager.destroy();
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
  
      if (
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] !== PermissionsAndroid.RESULTS.GRANTED ||
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] !== PermissionsAndroid.RESULTS.GRANTED ||
        granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] !== PermissionsAndroid.RESULTS.GRANTED
      ) {
        console.error('Bluetooth permissions not granted');
        return false;
      }
    }
    return true;
  };

  const scanDevices = () => {
    if (isScanning) {
      Alert.alert('Scanning', 'Already scanning for devices.');
      return;
    }

    setDevices([]); // Clear the current list
    setIsScanning(true);
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error(error);
        Alert.alert('Scan Error', 'Failed to scan for devices. Please try again.');
        setIsScanning(false);
        return;
      }
      
      if (device && device.name) {
        setDevices((prevDevices) => {
          if (!prevDevices.some((d) => d.id === device.id)) {
            return [...prevDevices, device as DeviceType];
          }
          return prevDevices;
        });
      }
    });

    // Stop scanning after 10 seconds
    setTimeout(() => {
      bleManager.stopDeviceScan();
      setIsScanning(false);
    }, 10000);
  };

  const connectToDevice = async (device: DeviceType) => {
    try {
      const connectedDevice = await bleManager.connectToDevice(device.id);
      setConnectedDevice(connectedDevice as DeviceType);
      bleManager.stopDeviceScan();
      setIsScanning(false);
      console.log(`Connected to ${connectedDevice.name}`);
      // Discover services and characteristics
      await connectedDevice.discoverAllServicesAndCharacteristics();
    } catch (error) {
      console.error('Failed to connect:', error);
      Alert.alert('Connection Error', 'Failed to connect to the device. Please try again.');
    }
  };

  const calculateDistance = (rssi: number) => {
    // RSSI (Received Signal Strength Indicator) to distance estimation
    const txPower = -59; // Typical value for TX power
    if (rssi === 0) {
      return -1.0;
    }
    const ratio = rssi * 1.0 / txPower;
    if (ratio < 1.0) {
      return Math.pow(ratio, 10);
    } else {
      const distance = (0.89976) * Math.pow(ratio, 7.7095) + 0.111;
      return distance;
    }
  };

  const handleDeviceSelect = (device: DeviceType) => {
    connectToDevice(device);
    const estimatedDistance = calculateDistance(device.rssi);
    setDistance(estimatedDistance);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bluetooth Devices</Text>
      <Button title={isScanning ? "Scanning..." : "Scan for Devices"} onPress={scanDevices} disabled={isScanning} />
      {connectedDevice && (
        <View style={styles.connectedContainer}>
          <Text style={styles.connectedText}>Connected to: {connectedDevice.name}</Text>
          {distance !== null && <Text>Estimated Distance: {distance.toFixed(2)} meters</Text>}
        </View>
      )}
      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.deviceItem} onPress={() => handleDeviceSelect(item)}>
            <Text>{item.name}</Text>
            <Text>RSSI: {item.rssi}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  connectedContainer: {
    marginVertical: 20,
    padding: 10,
    backgroundColor: '#d0f0c0',
    borderRadius: 8,
  },
  connectedText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  deviceItem: {
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
});

export default BluetoothPage;