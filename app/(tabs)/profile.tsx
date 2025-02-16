import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileScreen() {
  // TODO: Replace with actual user data
  const stats = {
    scannedCodes: 42,
    discoveredCodes: 15,
    peerConnections: 7,
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4c669f', '#3b5998', '#192f6a']}
        style={styles.header}
      >
        <View style={styles.profileInfo}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400' }}
            style={styles.avatar}
          />
          <Text style={styles.username}>Explorer #1234</Text>
        </View>
      </LinearGradient>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.scannedCodes}</Text>
          <Text style={styles.statLabel}>Scanned</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.discoveredCodes}</Text>
          <Text style={styles.statLabel}>Discovered</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.peerConnections}</Text>
          <Text style={styles.statLabel}>Peers</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    height: 200,
    padding: 20,
    justifyContent: 'flex-end',
  },
  profileInfo: {
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fff',
  },
  username: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    justifyContent: 'space-around',
    marginTop: -30,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    width: '30%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4c669f',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
});