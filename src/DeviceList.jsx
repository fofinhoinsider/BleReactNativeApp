/* eslint-disable react-native/no-inline-styles */
import {View, Text, TouchableOpacity} from 'react-native';
import React from 'react';
import {styles} from './styles/styles';

import {BUS_STOPS_IDS} from '../App';

const mapIdToAlias = id => `Ponto de ônibus ${BUS_STOPS_IDS.indexOf(id) + 1}`;

export const DeviceList = ({peripheral, connect, disconnect}) => {
  const {name, rssi, connected, id} = peripheral;

  return (
    <>
      {name && (
        <View style={styles.deviceContainer}>
          <View style={styles.deviceItem}>
            <Text style={styles.deviceName}>{mapIdToAlias(id)}</Text>
            <Text style={styles.deviceInfo}>RSSI: {rssi}</Text>
            <Text style={styles.deviceInfo}>MAC: {id}</Text>
          </View>

          <TouchableOpacity
            onPress={async () =>
              connected
                ? await disconnect(peripheral)
                : await connect(peripheral)
            }
            style={styles.deviceButton}>
            <Text
              style={[
                styles.scanButtonText,
                {fontWeight: 'bold', fontSize: 16},
              ]}>
              {connected ? 'Disconnect' : 'Connect'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
};

export const RetrieveList = ({peripheral, retrieve}) => {
  const {name, rssi, id} = peripheral;

  return (
    <>
      {name && (
        <View style={styles.deviceContainer}>
          <View style={styles.deviceItem}>
            <Text style={styles.deviceName}>{mapIdToAlias(name)}</Text>
            <Text style={styles.deviceInfo}>RSSI: {rssi}</Text>
            <Text style={styles.deviceInfo}>MAC: {id}</Text>
          </View>

          <TouchableOpacity
            onPress={async () => await retrieve(peripheral)}
            style={styles.deviceButton}>
            <Text
              style={[
                styles.scanButtonText,
                {fontWeight: 'bold', fontSize: 16},
              ]}>
              Retrieve
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
};
