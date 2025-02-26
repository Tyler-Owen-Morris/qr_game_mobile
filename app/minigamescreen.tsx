import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import WebSocketService from '@/src/services/websocket';

const BASE_WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8000';

export default function MiniGameScreen() {
  const { player1Id, player2Id, isPlayer1 } = useLocalSearchParams();
  const [gameState, setGameState] = useState(null);
  const [hasChosen, setHasChosen] = useState(false);

  useEffect(() => {
    WebSocketService.connect(player1Id as string);
    const handleMessage = (data: any) => {
      console.log('socket event:', data);
      if (data.event === 'start_game') {
        setGameState({ type: data.game_type, players: data.players });
      } else if (data.event === 'result') {
        setGameState((prev) => ({ ...prev, winner: data.winner }));
      } else if (data.event === 'rejected') {
        alert('Game full - try another QR');
        router.push('/(tabs)');
      }
    };
    WebSocketService.addMessageListener(handleMessage);
    return () => WebSocketService.removeMessageListener(handleMessage);
  }, []);

  const sendMove = (choice: string) => {
    if (gameState) {
      const myId = isPlayer1 == 'true' ? player1Id : player2Id;
      console.log({
        event: 'move',
        player_id: myId,
        data: { choice },
      });
      WebSocketService.instance?.send(
        JSON.stringify({
          event: 'move',
          player_id: myId,
          data: { choice },
        })
      );
      setHasChosen(true);
    }
  };

  if (!gameState) {
    return (
      <View style={styles.container}>
        <Text>Waiting for opponent...</Text>
      </View>
    );
  }

  if (gameState.winner !== undefined) {
    return (
      <View style={styles.container}>
        <Text>
          {gameState.winner === (isPlayer1 == 'true' ? player1Id : player2Id)
            ? 'You Won!'
            : 'You Lost!'}
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)')}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Back to App</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text>Rock Paper Scissors</Text>
      <TouchableOpacity
        onPress={() => sendMove('rock')}
        style={styles.button}
        disabled={hasChosen}
      >
        <Text style={styles.buttonText}>Rock</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => sendMove('paper')}
        style={styles.button}
        disabled={hasChosen}
      >
        <Text style={styles.buttonText}>Paper</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => sendMove('scissors')}
        style={styles.button}
        disabled={hasChosen}
      >
        <Text style={styles.buttonText}>Scissors</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  button: {
    backgroundColor: '#4c669f',
    padding: 10,
    borderRadius: 5,
    margin: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});
