/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-native/no-inline-styles */

import React, {useState, useEffect} from 'react';
import {
  Text,
  Alert,
  View,
  FlatList,
  Platform,
  StatusBar,
  SafeAreaView,
  NativeModules,
  useColorScheme,
  TouchableOpacity,
  NativeEventEmitter,
  PermissionsAndroid,
} from 'react-native';
import {styles} from './src/styles/styles';
import {DeviceList} from './src/DeviceList';
import {Schedule} from './src/Schedule';
import BleManager from 'react-native-ble-manager';
import {Colors} from 'react-native/Libraries/NewAppScreen';

const BleManagerModule = NativeModules.BleManager;
const BleManagerEmitter = new NativeEventEmitter(BleManagerModule);
const PERIPHERAL_ID = '24:0A:C4:FC:C5:E2';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const App = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [peripheralInfo, setPeripheralInfo] = useState({});
  const [schedule, setSchedule] = useState([]);

  const handleLocationPermission = async () => {
    if (Platform.OS === 'android' && Platform.Version >= 23) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Location permission granted');
        } else {
          console.log('Location permission denied');
        }
      } catch (error) {
        console.log('Error requesting location permission:', error);
      }
    }
  };

  useEffect(async () => {
    handleLocationPermission();

    await BleManager.enableBluetooth();
    console.log('Bluetooth is turned on!');

    await BleManager.start({showAlert: false});
    console.log('BleManager initialized');

    let stopConnectListener = BleManagerEmitter.addListener(
      'BleManagerConnectPeripheral',
      peripheral => {
        console.log('BleManagerConnectPeripheral:', peripheral);
      },
    );

    return () => {
      stopConnectListener.remove();
    };
  }, []);

  const connect = async () => {
    try {
      await BleManager.connect(PERIPHERAL_ID);

      await sleep(900);

      console.log('BLE device connected successfully');

      setIsFetching(true);

      const peripheralData = await BleManager.retrieveServices(PERIPHERAL_ID);
      setPeripheralInfo(peripheralData);

      if (peripheralData.characteristics) {
        for (let characteristic of peripheralData.characteristics) {
          if (characteristic.descriptors) {
            for (let descriptor of characteristic.descriptors) {
              try {
                let scheduleData = await BleManager.read(
                  PERIPHERAL_ID,
                  characteristic.service,
                  characteristic.characteristic,
                );

                setSchedule({...schedule, scheduleData});

                console.debug(
                  `[connectPeripheral][${PERIPHERAL_ID}] descriptor read as:`,
                  scheduleData,
                );
              } catch (error) {
                console.error(
                  `[connectPeripheral][${PERIPHERAL_ID}] failed to retrieve descriptor ${descriptor} for characteristic ${characteristic}:`,
                  error,
                );
              }
            }
          }
        }
      }

      setIsFetching(false);
    } catch (error) {
      throw new Error('Failed to bond');
    }
  };

  const disconnect = async peripheral => {
    try {
      await BleManager.disconnect(PERIPHERAL_ID);

      Alert.alert(`Disconnected from ${peripheral.name}`);
    } catch (error) {
      throw new Error('Failed to remove the bond');
    }
  };

  const isDarkMode = useColorScheme() === 'dark';
  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  return (
    <SafeAreaView style={[backgroundStyle, styles.container]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <View style={{pdadingHorizontal: 20}}>
        <Text
          style={[
            styles.title,
            {color: isDarkMode ? Colors.white : Colors.black},
          ]}>
          Smart Bus
        </Text>
        <TouchableOpacity
          onPress={connect}
          activeOpacity={0.5}
          style={styles.scanButton}>
          <Text style={styles.scanButtonText}>
            {isScanning ? 'Buscando...' : 'Buscar ponto de ônibus'}
          </Text>
        </TouchableOpacity>

        <Text
          style={[
            styles.subtitle,
            {color: isDarkMode ? Colors.white : Colors.black},
          ]}>
          Pontos de ônibus conectado:
        </Text>
        {connectedDevices.length > 0 ? (
          <FlatList
            data={connectedDevices}
            renderItem={({item}) => (
              <DeviceList
                peripheral={item}
                connect={connect}
                disconnect={disconnect}
              />
            )}
            keyExtractor={item => item.id}
          />
        ) : (
          <Text style={styles.noDevicesText}>
            Nenhum ponto de ônibus conectado
          </Text>
        )}

        {connectedDevices.length > 0 && (
          <>
            <Text
              style={[
                styles.subtitle,
                {color: isDarkMode ? Colors.white : Colors.black},
              ]}>
              Agenda
            </Text>
            {isFetching ? (
              <Text style={styles.noDevicesText}> Baixando agenda... </Text>
            ) : (
              <>
                <Text>{`PeripheralInfo: ${JSON.stringify(
                  peripheralInfo,
                )}`}</Text>
                {/* <Schedule schedule={schedule} /> */}
              </>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

export default App;
