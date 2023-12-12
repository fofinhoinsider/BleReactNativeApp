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
import {DeviceList, RetrieveList} from './src/DeviceList';
import {Schedule} from './src/Schedule';
import BleManager from 'react-native-ble-manager';
import {Colors} from 'react-native/Libraries/NewAppScreen';

const CHARACTERISTIC_UUID_8012_1 = 'beb5483e-36e1-4688-b7f5-ea073618012a';
const CHARACTERISTIC_UUID_8012_2 = 'beb5483e-36e1-4688-b7f5-ea073618012b';
const CHARACTERISTIC_UUID_8022_1 = 'beb5483e-36e1-4688-b7f5-ea073618022a';
const CHARACTERISTIC_UUID_8022_2 = 'beb5483e-36e1-4688-b7f5-ea073618022b';
const CHARACTERISTIC_UUID_8022_3 = 'beb5483e-36e1-4688-b7f5-ea073618022c';
const SERVICE_UUID_8012 = '4fafc201-1fb5-459e-8fcc-c5c9c3318012';
const SERVICE_UUID_8022 = '4fafc201-1fb5-459e-8fcc-c5c9c3318022';
const CHARACTERISTICS = [
  {characteristic: CHARACTERISTIC_UUID_8012_1, service: SERVICE_UUID_8012},
  {characteristic: CHARACTERISTIC_UUID_8012_2, service: SERVICE_UUID_8012},
  {characteristic: CHARACTERISTIC_UUID_8022_1, service: SERVICE_UUID_8022},
  {characteristic: CHARACTERISTIC_UUID_8022_2, service: SERVICE_UUID_8022},
  {characteristic: CHARACTERISTIC_UUID_8022_3, service: SERVICE_UUID_8022},
];

export const BUS_STOPS_IDS = ['24:0A:C4:FC:C5:E2', 'E0:E2:E6:00:6A:02'];

const BleManagerModule = NativeModules.BleManager;
const BleManagerEmitter = new NativeEventEmitter(BleManagerModule);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function myReadInt32LEFromByteArray(byteArray) {
  return byteArray.reduce(
    (accumulator, currentValue, currentIndex) =>
      accumulator + currentValue * Math.pow(256, currentIndex),
  );
}

const App = () => {
  const peripherals = new Map();
  const [isScanning, setIsScanning] = useState(false);
  const [connectedDevices, setConnectedDevices] = useState([]);
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
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

  const handleGetConnectedDevices = () => {
    BleManager.getConnectedPeripherals([]).then(results => {
      for (let i = 0; i < results.length; i++) {
        let peripheral = results[i];
        peripheral.connected = true;
        peripherals.set(peripheral.id, peripheral);
        setConnectedDevices(Array.from(peripherals.values()));
      }
    });
  };

  useEffect(() => {
    handleLocationPermission();

    BleManager.enableBluetooth().then(() => {
      console.log('Bluetooth is turned on!');
    });

    BleManager.start({showAlert: false}).then(() => {
      console.log('BleManager initialized');
      handleGetConnectedDevices();
    });

    let stopDiscoverListener = BleManagerEmitter.addListener(
      'BleManagerDiscoverPeripheral',
      peripheral => {
        peripherals.set(peripheral.id, peripheral);
        setDiscoveredDevices(Array.from(peripherals.values()));
      },
    );

    let stopConnectListener = BleManagerEmitter.addListener(
      'BleManagerConnectPeripheral',
      peripheral => {
        console.log('BleManagerConnectPeripheral:', peripheral);
      },
    );

    let stopScanListener = BleManagerEmitter.addListener(
      'BleManagerStopScan',
      () => {
        setIsScanning(false);
        console.log(discoveredDevices);
        console.log('scan stopped');
      },
    );

    return () => {
      stopDiscoverListener.remove();
      stopConnectListener.remove();
      stopScanListener.remove();
    };
  }, []);

  const scan = () => {
    if (!isScanning) {
      BleManager.scan([], 5, true)
        .then(() => {
          console.log('Buscando ponto de ônibus...');
          setIsScanning(true);
        })
        .catch(error => {
          console.error(error);
        });
    }
  };

  const connect = async peripheral => {
    try {
      await BleManager.connect(peripheral.id);
      await sleep(900);

      peripheral.connected = true;
      peripherals.set(peripheral.id, peripheral);
      const devices = Array.from(peripherals.values());
      setConnectedDevices(Array.from(devices));
      setDiscoveredDevices(Array.from(devices));
      console.log('BLE device paired successfully');
    } catch (error) {
      throw new Error('Failed to bond');
    }
  };

  const retrieve = async peripheral => {
    setIsFetching(true);
    const scheduleData = await Promise.all(
      CHARACTERISTICS.map(async characteristic => {
        let byteArray = await BleManager.read(
          peripheral.id,
          characteristic.service,
          characteristic.characteristic,
        );

        let timestamp = myReadInt32LEFromByteArray(byteArray);
        let date = new Date(1000 * timestamp);

        let hours = date.getHours();
        let minutes = date.getMinutes();

        let data = `${hours}:${minutes}`;

        return {
          ...characteristic,
          data,
        };
      }),
    );

    setSchedule(scheduleData);
    setIsFetching(false);
  };

  const disconnect = async peripheral => {
    try {
      await BleManager.disconnect(peripheral.id);

      peripheral.connected = false;
      peripherals.set(peripheral.id, peripheral);
      const devices = Array.from(peripherals.values());
      setConnectedDevices(Array.from(devices));
      setDiscoveredDevices(Array.from(devices));
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
          onPress={scan}
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
          Pontos de ônibus encontrados:
        </Text>
        {discoveredDevices.filter(
          device => BUS_STOPS_IDS.indexOf(device.id) !== -1,
        ).length > 0 ? (
          <FlatList
            data={discoveredDevices.filter(
              device => BUS_STOPS_IDS.indexOf(device.id) !== -1,
            )}
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
            Nenhum ponto de ônibus encontrado
          </Text>
        )}

        <Text
          style={[
            styles.subtitle,
            {color: isDarkMode ? Colors.white : Colors.black},
          ]}>
          Ponto de ônibus conectado:
        </Text>
        {connectedDevices.length > 0 ? (
          <FlatList
            data={connectedDevices}
            renderItem={({item}) => (
              <RetrieveList
                peripheral={item}
                retrieve={retrieve}
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
              <Schedule schedule={schedule} />
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

export default App;
