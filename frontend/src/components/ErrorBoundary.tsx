import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

interface ErrorBoundaryProps {
  screenName: string;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error(`[ErrorBoundary:${this.props.screenName}]`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={s.container}>
          <ScrollView contentContainerStyle={s.scroll}>
            <Text style={s.title}>CRASH on {this.props.screenName}</Text>
            <Text style={s.label}>Error:</Text>
            <Text style={s.error}>{this.state.error?.toString()}</Text>
            <Text style={s.label}>Stack:</Text>
            <Text style={s.stack}>{this.state.error?.stack}</Text>
            <Text style={s.label}>Component Stack:</Text>
            <Text style={s.stack}>{this.state.errorInfo?.componentStack}</Text>
            <TouchableOpacity style={s.btn} onPress={() => this.setState({ hasError: false, error: null, errorInfo: null })}>
              <Text style={s.btnText}>Try Again</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', padding: 20, paddingTop: 60 },
  scroll: { paddingBottom: 100 },
  title: { fontSize: 20, fontWeight: '700', color: '#e94560', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#e94560', marginTop: 16, marginBottom: 4 },
  error: { fontSize: 14, color: '#ffffff', fontFamily: 'monospace' },
  stack: { fontSize: 11, color: '#aaaaaa', fontFamily: 'monospace', lineHeight: 16 },
  btn: { marginTop: 30, backgroundColor: '#e94560', padding: 14, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
