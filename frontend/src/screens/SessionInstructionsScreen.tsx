// frontend/src/screens/SessionInstructionsScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

export default function SessionInstructionsScreen({ route, navigation }: any) {
  const { studentId, firstName } = route.params;

  const handleStartSession = () => {
    navigation.navigate('Tracker', { studentId, firstName });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentWrapper}>
            <Text style={styles.header}>Session Preparation</Text>
            <Text style={styles.subHeader}>Student: {firstName}</Text>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>How to Track This Session</Text>

              <View style={styles.step}>
                <Text style={styles.stepTitle}>1. Two-Minute Intervals</Text>
                <Text style={styles.stepText}>
                  The timer automatically divides the session into 2-minute (currently 10 seconds for demo purposes) intervals. Focus on behaviors occurring during the active window.
                </Text>
              </View>

              <View style={styles.step}>
                <Text style={styles.stepTitle}>2. Record Letter Codes</Text>
                <Text style={styles.stepText}>
                  Tap a behavior's letter code whenever you observe it. You can log multiple behaviors within the same interval.
                </Text>
              </View>

              <View style={styles.step}>
                <Text style={styles.stepTitle}>3. Review Definitions</Text>
                <Text style={styles.stepText}>
                  Refer to the behavior definitions panel during the session if you need to confirm what counts for each code. Navigate to it by selecting the "Options & Info" button in the top right corner.
                </Text>
              </View>

              <View style={styles.step}>
                <Text style={styles.stepTitle}>4. End & Summarize</Text>
                <Text style={styles.stepText}>
                  Tap "End Session" when finished to review interval totals and view the session summary.
                </Text>
              </View>
            </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.contentWrapper}>
         <TouchableOpacity style={styles.startBtn} onPress={handleStartSession}>
              <Text style={styles.startBtnText}>Start Session</Text>
            </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  scrollContent: { padding: 15, paddingBottom: 100 },
  contentWrapper: { width: '100%', maxWidth: 600,},
  header: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50', marginBottom: 4 },
  subHeader: { fontSize: 16, color: '#7f8c8d', marginBottom: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', marginBottom: 16 },
  step: { marginBottom: 16 },
  stepTitle: { fontSize: 15, fontWeight: 'bold', color: '#4A90E2', marginBottom: 4 },
  stepText: { fontSize: 14, color: '#34495e', lineHeight: 20 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#f1f2f6',
    alignItems: 'center',
  },
  startBtn: {
    backgroundColor: '#2ed573',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
