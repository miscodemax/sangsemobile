import React from 'react';
import { Text, View } from 'react-native';

interface FormFieldProps {
  label: string;
  error?: string;
  isOptional?: boolean;
  children: React.ReactNode;
}

export default function FormField({ label, error, isOptional = false, children }: FormFieldProps) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 8 }}>
        {label} {!isOptional && '*'}
      </Text>
      {children}
      {error && <Text style={{ color: '#EF4444', fontSize: 13, marginTop: 6 }}>{error}</Text>}
    </View>
  );
}
