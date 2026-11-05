// frontend/src/screens/SessionSummaryScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Behavior } from '../types';

export default function SessionSummaryScreen({ route, navigation }: any) {
  const { firstName, totalIntervals, events, behaviorsConfig, finalNotes } = route.params;

  const intervalArray = Array.from({ length: totalIntervals }, (_, i) => i);

  const isBehaviorLogged = (intervalIndex: number, behaviorId: string) => {
    // Standardized event tracking targets to use camelCase attributes
    return events.some((e: any) => e.intervalIndex === intervalIndex && e.behaviorId === behaviorId);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Session Summary: {firstName}</Text>
        <Text style={styles.subtitle}>Total Recording Blocks Monitored: {totalIntervals}</Text>

        <View style={styles.chartOuterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={styles.matrixContainer}>
              <View style={styles.matrixRow}>
                <View style={[styles.labelCell, styles.headerCellBackground]}>
                  <Text style={styles.headerCellText}>Behavior</Text>
                </View>
                {intervalArray.map((idx) => (
                  <View key={idx} style={[styles.gridCell, styles.headerCellBackground]}>
                    <Text style={styles.headerCellText}>i{idx}</Text>
                  </View>
                ))}
              </View>

              {behaviorsConfig.map((behavior: Behavior) => (
                <View key={behavior._id} style={styles.matrixRow}>
                  <View style={styles.labelCell}>
                    <Text style={[styles.behaviorLabel, { color: behavior.color }]}>
                      {behavior.code} ({behavior.name})
                    </Text>
                  </View>
                  {intervalArray.map((idx) => {
                    const active = isBehaviorLogged(idx, behavior._id);
                    return (
                      <View 
                        key={idx} 
                        style={[
                          styles.gridCell, 
                          active ? { backgroundColor: behavior.color } : styles.inactiveCell
                        ]}
                      >
                        {active && <Text style={styles.activeIndicatorText}>✓</Text>}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Total Metric Counts:</Text>
          {behaviorsConfig.map((b: Behavior) => {
            const totalCount = events.filter((e: any) => e.behaviorId === b._id).length;
            return (
              <Text key={b._id} style={styles.summaryText}>
                • {b.name} ({b.code}): <Text style={{ fontWeight: 'bold' }}>{totalCount} times logged</Text>
              </Text>
            );
          })}
        </View>

        <View style={styles.notesCard}>
          <Text style={styles.notesTitle}>Session Observations & Context:</Text>
          <Text style={styles.notesContentText}>
            {finalNotes && finalNotes.trim().length > 0 
              ? finalNotes 
              : 'No manual notes or context markers appended to this tracking record.'}
          </Text>
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Dashboard')}>
        <Text style={styles.backBtnText}>Return to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa', padding: 20 },
  scrollContent: { paddingBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#7f8c8d', textAlign: 'center', marginTop: 4, marginBottom: 20 },
  chartOuterContainer: { backgroundColor: '#fff', borderRadius: 12, padding: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4 },
  matrixContainer: { flexDirection: 'column' },
  matrixRow: { flexDirection: 'row', alignItems: 'center' },
  labelCell: { width: 110, height: 45, justifyContent: 'center', paddingLeft: 8, borderBottomWidth: 1, borderBottomColor: '#e1e1e1', borderRightWidth: 1, borderRightColor: '#e1e1e1' },
  behaviorLabel: { fontSize: 12, fontWeight: 'bold' },
  gridCell: { width: 45, height: 45, justifyContent: 'center', alignItems: 'center', borderWidth: 0.5, borderColor: '#e1e1e1' },
  inactiveCell: { backgroundColor: '#f9f9f9' },
  headerCellBackground: { backgroundColor: '#eceff1', borderColor: '#b0bec5' },
  headerCellText: { fontSize: 11, fontWeight: '700', color: '#546e7a', textAlign: 'center' },
  activeIndicatorText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginTop: 15, elevation: 1 },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: '#2c3e50', marginBottom: 6 },
  summaryText: { fontSize: 14, color: '#57606f', marginVertical: 2 },
  notesCard: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginTop: 15, borderLeftWidth: 4, borderLeftColor: '#4A90E2', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  notesTitle: { fontSize: 15, fontWeight: '700', color: '#2c3e50', marginBottom: 6 },
  notesContentText: { fontSize: 14, color: '#57606f', fontStyle: 'italic', lineHeight: 20 },
  backBtn: { backgroundColor: '#4A90E2', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 15 },
  backBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
