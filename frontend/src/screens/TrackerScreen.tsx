import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { apiService } from '../services/api';
import { Behavior, Session, BehaviorEvent } from '../types';

export default function TrackerScreen({ route, navigation }: any) {
  const { studentId, userId, firstName } = route.params;
  
  const [behaviors, setBehaviors] = useState<Behavior[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [intervalIndex, setIntervalIndex] = useState(0);
  
  const TEST_INTERVAL_DURATION = 10; 
  const [timeLeft, setTimeLeft] = useState(TEST_INTERVAL_DURATION);
  const [loading, setLoading] = useState(true);
  const [eventHistory, setEventHistory] = useState<BehaviorEvent[]>([]);

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');

  const intervalIndexRef = useRef(intervalIndex);
  const activeSessionRef = useRef(session);

  useEffect(() => {
    intervalIndexRef.current = intervalIndex;
    activeSessionRef.current = session;
  }, [intervalIndex, session]);

  useEffect(() => {
    async function startTrackingSession() {
      const activeBehaviors = await apiService.getBehaviorsByStudent(studentId);
      setBehaviors(activeBehaviors);

      // Converted session creation keys to strict camelCase
      const newSession = await apiService.startSession({
        userId: userId,
        studentId: studentId,
        startTime: new Date().toISOString(),
        endTime: null,
        intervalSeconds: TEST_INTERVAL_DURATION, 
        status: 'active',
        notes: ''
      });
      
      setSession(newSession);
      setLoading(false);
    }
    startTrackingSession();
  }, [studentId]);

  useEffect(() => {
    if (loading || !session) return;

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          setIntervalIndex((prevIndex) => prevIndex + 1);
          return TEST_INTERVAL_DURATION; 
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, session]);

  const handleLogEvent = async (behaviorItem: Behavior) => {
    if (!activeSessionRef.current) return;
    
    // Standardized frontend temporary tracking event keys to camelCase
    const newEvent: BehaviorEvent = {
      _id: `temp_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: activeSessionRef.current._id,
      studentId: studentId,
      behaviorId: behaviorItem._id,
      userId: activeSessionRef.current.userId,
      timestamp: new Date().toLocaleTimeString(),
      intervalIndex: intervalIndexRef.current
    };

    setEventHistory(prev => [newEvent, ...prev]);
    await apiService.logBehaviorEvent(newEvent);
  };

  const handleEndSession = async () => {
    if (!session) return;
    await apiService.endSession(session._id, sessionNotes);
    
    navigation.navigate('SessionSummary', {
      firstName,
      totalIntervals: intervalIndex + 1,
      events: eventHistory,
      behaviorsConfig: behaviors,
      finalNotes: sessionNotes
    });
  };

  const getIntervalSummaryString = (index: number) => {
    const logsInThisInterval = eventHistory.filter(e => e.intervalIndex === index);
    if (logsInThisInterval.length === 0) return 'None';
    
    const codes = logsInThisInterval.map(log => {
      const match = behaviors.find(b => b._id === log.behaviorId);
      return match ? match.code : '?';
    });
    
    return [...new Set(codes)].join(', ');
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4A90E2" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.studentName}>Student: {firstName}</Text>
        <TouchableOpacity style={styles.drawerTriggerBtn} onPress={() => setDrawerVisible(true)}>
          <Text style={styles.drawerTriggerText}>⚙️ Options & Info</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.intervalBox}>
        <View style={styles.statColumn}>
          <Text style={styles.statLabel}>Active Interval</Text>
          <Text style={styles.intervalNumber}>#{intervalIndex}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statColumn}>
          <Text style={styles.statLabel}>Auto-Advance</Text>
          <Text style={[styles.timerNumber, timeLeft <= 3 && styles.timerUrgent]}>
            0:{timeLeft < 10 ? '0' : ''}{timeLeft}
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        {behaviors.map((item) => (
          <TouchableOpacity
            key={item._id}
            style={[styles.tile, { backgroundColor: item.color }]}
            onPress={() => handleLogEvent(item)}
          >
            <Text style={styles.tileCode}>{item.code}</Text>
            <Text style={styles.tileName}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.feedWrapper}>
        <Text style={styles.feedHeader}>Live Session Track Log</Text>
        <FlatList
          data={Array.from({ length: intervalIndex + 1 }, (_, i) => i).reverse()}
          keyExtractor={(item) => item.toString()}
          renderItem={({ item }) => (
            <View style={[styles.feedItem, item === intervalIndex && styles.activeFeedItem]}>
              <Text style={styles.feedInterval}>Interval #{item} {item === intervalIndex ? '(Current)' : ''}</Text>
              <Text style={styles.feedCodes}>Codes: {getIntervalSummaryString(item)}</Text>
            </View>
          )}
          style={styles.feedList}
        />
      </View>

      <TouchableOpacity style={styles.endBtn} onPress={handleEndSession}>
        <Text style={styles.endBtnText}>Complete Tracker and View Summary</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={drawerVisible}
        onRequestClose={() => setDrawerVisible(false)}
      >
        <View style={styles.drawerOverlay}>
          <TouchableOpacity style={styles.drawerDismissZone} onPress={() => setDrawerVisible(false)} />
          
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={styles.drawerContentCard}
          >
            <View style={styles.drawerHandleBar} />
            <Text style={styles.drawerTitle}>Session Options & Definitions</Text>
            
            <FlatList
              data={behaviors}
              keyExtractor={(item) => item._id}
              ListHeaderComponent={() => <Text style={styles.sectionHeading}>Behavior Operational Definitions</Text>}
              renderItem={({ item }) => (
                <View style={styles.definitionBlock}>
                  <Text style={[styles.definitionName, { color: item.color }]}>
                    [{item.code}] {item.name}
                  </Text>
                  <Text style={styles.definitionText}>{item.description || 'No definition provided.'}</Text>
                </View>
              )}
              style={styles.definitionScrollList}
            />

            <View style={styles.notesSection}>
              <Text style={styles.sectionHeading}>Session Observations & Notes</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Type overall observations..."
                placeholderTextColor="#a4b0be"
                multiline={true}
                value={sessionNotes}
                onChangeText={setSessionNotes}
              />
            </View>

            <TouchableOpacity style={styles.closeDrawerBtn} onPress={() => setDrawerVisible(false)}>
              <Text style={styles.closeDrawerBtnText}>Save & Apply Changes</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  ); 
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  studentName: { fontSize: 28, fontWeight: '700', color: '#2c3e50' },
  drawerTriggerBtn: { backgroundColor: '#f1f2f6', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#dfe4ea' },
  drawerTriggerText: { fontSize: 13, fontWeight: '600', color: '#57606f' },
  intervalBox: { backgroundColor: '#f1f2f6', padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 15 },
  statColumn: { alignItems: 'center', flex: 1 },
  statLabel: { fontSize: 11, textTransform: 'uppercase', color: '#747d8c', fontWeight: '700' },
  intervalNumber: { fontSize: 32, fontWeight: '900', color: '#2f3542' },
  timerNumber: { fontSize: 32, fontWeight: '900', color: '#4A90E2' },
  timerUrgent: { color: '#ff4757' },
  divider: { width: 1, height: 40, backgroundColor: '#ced6e0' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 15 },
  tile: { width: '48%', height: 90, borderRadius: 12, padding: 10, justifyContent: 'center', alignItems: 'center', marginVertical: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  tileCode: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  tileName: { fontSize: 12, fontWeight: '600', color: '#fff', textAlign: 'center' },
  feedWrapper: { flex: 1, backgroundColor: '#f8f9fa', borderRadius: 12, padding: 15, marginBottom: 15 },
  feedHeader: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  feedList: { flex: 1 },
  feedItem: { paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#eef2f3', flexDirection: 'row', justifyContent: 'space-between' },
  activeFeedItem: { backgroundColor: '#e8f4fd', borderRadius: 6 },
  feedInterval: { fontSize: 13, fontWeight: '600', color: '#555' },
  feedCodes: { fontSize: 13, fontWeight: 'bold', color: '#2c3e50' },
  endBtn: { backgroundColor: '#2ed573', padding: 16, borderRadius: 12, alignItems: 'center' },
  endBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  drawerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  drawerDismissZone: { flex: 1 },
  drawerContentCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  drawerHandleBar: { width: 40, height: 5, backgroundColor: '#ced6e0', borderRadius: 3, alignSelf: 'center', marginBottom: 15 },
  drawerTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', textAlign: 'center', marginBottom: 20 },
  sectionHeading: { fontSize: 13, fontWeight: '700', color: '#747d8c', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 5 },
  definitionScrollList: { maxHeight: 180, marginBottom: 15 },
  definitionBlock: { marginBottom: 12, backgroundColor: '#f8f9fa', padding: 10, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#ced6e0' },
  definitionName: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  definitionText: { fontSize: 13, color: '#57606f', lineHeight: 18 },
  notesSection: { marginBottom: 20 },
  notesInput: { backgroundColor: '#f1f2f6', borderRadius: 10, padding: 12, height: 90, textAlignVertical: 'top', fontSize: 14, color: '#2c3e50' },
  closeDrawerBtn: { backgroundColor: '#4A90E2', padding: 15, borderRadius: 12, alignItems: 'center' },
  closeDrawerBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' }
});