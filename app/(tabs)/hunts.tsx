import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Modal,
} from 'react-native';
import AuthService from '@/src/services/auth';
import { router } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export default function HuntsScreen() {
  const [activeHunts, setActiveHunts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [skip, setSkip] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 10;

  useEffect(() => {
    fetchActiveHunts(true);
  }, []);

  const fetchActiveHunts = async (reset = false) => {
    setLoading(true);
    try {
      const token = await AuthService.getToken();
      const response = await fetch(
        `${API_URL}/hunts/active?skip=${reset ? 0 : skip}&limit=${limit}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      setTotal(data.total);
      setActiveHunts((prev) => (reset ? data.hunts : [...prev, ...data.hunts]));
      setSkip((prev) => (reset ? limit : prev + limit));
    } catch (error) {
      console.error('Error fetching active hunts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && activeHunts.length < total) fetchActiveHunts();
  };

  const HuntStatus = ({ hunt }: { hunt: any }) => {
    const [abandonModalVisible, setAbandonModalVisible] = useState(false); // Add state for modal

    const confirmAbandon = async () => {
      try {
        const token = await AuthService.getToken();
        const response = await fetch(`${API_URL}/hunts/abandon/${hunt.id}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to abandon hunt');
        setAbandonModalVisible(false);
        setActiveHunts((prev) => prev.filter((h) => h.id !== hunt.id)); // Remove from list
      } catch (error) {
        console.error('Error abandoning hunt:', error);
        //setModalMessage('Failed to abandon hunt. Try again.');
        //setModalVisible(true); // Assuming a global modal exists - adjust if needed
      }
    };

    return (
      <View style={styles.huntCard}>
        <Text style={styles.huntName}>{hunt.name}</Text>
        <Text style={styles.huntStatus}>
          {hunt.completed_at
            ? 'Completed'
            : `Step ${hunt.current_step?.order || 1} of ${hunt.steps}`}
        </Text>
        {!hunt.completed_at && (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-around',
              marginTop: 10,
            }}
          >
            <TouchableOpacity
              style={styles.abandonButton}
              onPress={() => setAbandonModalVisible(true)} // Trigger confirmation
            >
              <Text style={styles.abandonText}>Abandon</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.resumeButton}
              onPress={() =>
                router.push({
                  pathname: '/huntscreen',
                  params: { huntId: hunt.id },
                })
              }
            >
              <Text style={styles.buttonText}>Resume</Text>
            </TouchableOpacity>
          </View>
        )}
        <Modal
          animationType="slide"
          transparent={true}
          visible={abandonModalVisible}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>
                Are you sure you want to abandon "{hunt.name}"?
              </Text>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => {
                  confirmAbandon();
                }}
              >
                <Text style={styles.buttonText}>Yes, Abandon</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setAbandonModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Active Scavenger Hunts</Text>
      {loading && activeHunts.length === 0 ? (
        <ActivityIndicator size="large" color="#4c669f" />
      ) : (
        <FlatList
          data={activeHunts}
          renderItem={({ item }) => <HuntStatus hunt={item} />}
          keyExtractor={(item) => item.id}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading ? <ActivityIndicator size="large" color="#4c669f" /> : null
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  huntCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  huntName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  huntStatus: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  resumeButton: {
    backgroundColor: '#4c669f',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginTop: 10,
    alignSelf: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  listContent: {
    paddingBottom: 20,
  },
  abandonButton: {
    backgroundColor: '#4c669f',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginTop: 10,
    alignSelf: 'center',
  },
  abandonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    //color: '#dc3545',
    //textDecorationLine: 'underline',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    width: 300,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
  },
  cancelButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
});
