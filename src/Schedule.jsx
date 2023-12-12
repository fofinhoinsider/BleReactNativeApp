/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {styles} from './styles/styles';
import {Table, Row, Rows} from 'react-native-table-component';
import {View} from 'react-native';

export const Schedule = ({schedule}) => {
  const tableHead = ['Linha', 'Ônibus', 'Timestamp'];

  return (
    <View>
      <Table borderStyle={{borderWidth: 2, borderColor: '#c8e1ff'}}>
        <Row
          data={tableHead}
          style={styles.tableHead}
          textStyle={styles.deviceItem}
        />
        <Rows
          data={schedule.map(item => [
            extractLineFromServiceUUID(item.service),
            item.characteristic.slice(-1),
            item.data,
          ])}
        />
      </Table>
    </View>
  );
};

const extractLineFromServiceUUID = serviceUUID => serviceUUID.slice(-4);
