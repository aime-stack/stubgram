import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, PanResponder, Animated, TouchableOpacity, TextInput } from 'react-native';
import { colors } from '@/styles/commonStyles';

interface TextOverlayProps {
  id: string;
  initialText: string;
  color: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: any) => void;
}

export default function TextOverlay({ id, initialText, color, isSelected, onSelect, onUpdate }: TextOverlayProps) {
  const [text, setText] = useState(initialText);
  const [isEditing, setIsEditing] = useState(false);
  
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;

  // Simple drag logic
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => !isEditing,
      onPanResponderGrant: () => {
        onSelect(id);
        pan.setOffset({
          // @ts-ignore
          x: pan.x._value,
          // @ts-ignore
          y: pan.y._value
        });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.container,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale: scale }
          ]
        },
        isSelected && styles.selected
      ]}
    >
      {isEditing ? (
        <TextInput
          style={[styles.input, { color }]}
          value={text}
          onChangeText={setText}
          onBlur={() => setIsEditing(false)}
          autoFocus
          multiline
        />
      ) : (
        <TouchableOpacity 
          onLongPress={() => setIsEditing(true)}
          onPress={() => onSelect(id)}
        >
          <Text style={[styles.text, { color }]}>{text}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    padding: 10,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    borderWidth: 1,
    borderColor: '#FFF',
    borderStyle: 'dashed',
    borderRadius: 4,
  },
  text: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  input: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 150,
  }
});
