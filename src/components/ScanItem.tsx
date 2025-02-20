import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Scan {
  scan_time: string;
  success: boolean;
  scan_type: string;
  proximity_status?: string | null;
  qr_code?: string | null;
  peer_username?: string | null;
}

interface Props {
  scan: Scan;
}

const ScanItem: React.FC<Props> = ({ scan }) => {
  const date = new Date(scan.scan_time).toLocaleString();

  return (
    <View style={styles.container}>
      <Text style={styles.time}>{date}</Text>
      <Text style={styles.type}>Type: {scan.scan_type}</Text>
      {scan.scan_type === 'peer' && scan.peer_username && (
        <Text style={styles.detail}>Peer: {scan.peer_username}</Text>
      )}
      {scan.scan_type !== 'peer' && scan.qr_code && (
        <Text style={styles.detail}>QR Code: {scan.qr_code}</Text>
      )}
      {scan.proximity_status && (
        <Text style={styles.detail}>Proximity: {scan.proximity_status}</Text>
      )}
      <Text style={styles.success}>
        Status: {scan.success ? 'Success' : 'Failed'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  time: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  type: {
    fontSize: 14,
    color: '#555',
  },
  detail: {
    fontSize: 14,
    color: '#333',
  },
  success: {
    fontSize: 14,
    //color: (scan) => (scan.success ? '#28a745' : '#dc3545'), // Green for success, red for fail
  },
});

export default ScanItem;
