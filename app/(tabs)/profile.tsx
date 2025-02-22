import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import AuthService from '@/src/services/auth';
import { useScanHistory } from '@/src/context/ScanHistoryContext';
import ScanItem from '@/src/components/ScanItem';

export default function ProfileScreen() {
  const [player, setPlayer] = useState<any | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const { scans, total, loading, fetchScans } = useScanHistory();

  useEffect(() => {
    setPage(1);
    fetchScans(true); // Initial fetch, reset state
  }, [fetchScans]);

  const loadMore = () => {
    if (!loading && !loadingMore && scans.length < total) {
      setLoadingMore(true);
      fetchScans(); // Fetch next page
      setTimeout(() => setLoadingMore(false), 1000); // 1-second debounce
    }
  };

  useEffect(() => {
    const loadPlayer = async () => {
      const player_data = await AuthService.getPlayerData();
      setPlayer(player_data);
      //console.log('playerdata:', player_data);
    };
    loadPlayer();
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4c669f', '#3b5998', '#192f6a']}
        style={styles.header}
      >
        <View style={styles.profileInfo}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
            }}
            style={styles.avatar}
          />
          {player ? (
            <Text style={styles.username}>{player.username}</Text>
          ) : (
            <></>
          )}
        </View>
      </LinearGradient>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {player ? player.scan_counts?.total : 0}
          </Text>
          <Text style={styles.statLabel}>Scanned</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {player ? player.scan_counts?.discovery : 0}
          </Text>
          <Text style={styles.statLabel}>Discovered</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {player ? player.scan_counts?.peers : 0}
          </Text>
          <Text style={styles.statLabel}>Peers</Text>
        </View>
      </View>

      <View style={styles.historyContainer}>
        <FlatList
          data={scans}
          renderItem={({ item }) => <ScanItem scan={item} />}
          keyExtractor={(item, index) => `${item.scan_time}-${index}`}
          onEndReached={loadMore}
          onEndReachedThreshold={0.2}
          ListFooterComponent={
            loading || loadingMore ? (
              <ActivityIndicator size="large" color="#4c669f" />
            ) : null
          }
          showsVerticalScrollIndicator={true}
          horizontal={false}
          contentContainerStyle={styles.flatListContent}
        />
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
    shadowOffset: { width: 0, height: 2 },
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
  historyContainer: {
    flex: 1, // Takes remaining space
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  historyHeader: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  flatListContent: {
    paddingBottom: 20, // Space at bottom for scrolling
  },
});
