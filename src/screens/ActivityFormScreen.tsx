import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';

import {
  DEFAULT_ACTIVITY_TYPES,
  createActivity,
  getActivity,
  listDistinctActivityTypes,
  updateActivity,
} from '../db/activities';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ActivityForm'>;

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export default function ActivityFormScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { plotId, activityId } = route.params;
  const isEditing = activityId != null;

  const [type, setType] = useState('');
  const [date, setDate] = useState(() => new Date());
  const [notes, setNotes] = useState('');
  const [knownTypes, setKnownTypes] = useState<string[]>(DEFAULT_ACTIVITY_TYPES);
  const [typeFocused, setTypeFocused] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listDistinctActivityTypes().then((usedTypes) => {
      const merged = [...DEFAULT_ACTIVITY_TYPES];
      for (const usedType of usedTypes) {
        if (!merged.some((existing) => existing.toLowerCase() === usedType.toLowerCase())) {
          merged.push(usedType);
        }
      }
      setKnownTypes(merged);
    });
  }, []);

  useEffect(() => {
    if (activityId == null) return;
    getActivity(activityId).then((activity) => {
      if (!activity) return;
      setType(activity.type);
      setDate(parseDateInput(activity.date));
      setNotes(activity.notes ?? '');
    });
  }, [activityId]);

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? t('activityForm.editTitle') : t('activityForm.newTitle'),
    });
  }, [navigation, isEditing, t]);

  const suggestions = useMemo(() => {
    const query = type.trim().toLowerCase();
    return knownTypes
      .filter((candidate) => candidate.toLowerCase() !== query)
      .filter((candidate) => (query ? candidate.toLowerCase().includes(query) : true))
      .slice(0, 6);
  }, [type, knownTypes]);

  const canSave = type.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const input = { plotId, type: type.trim(), date: formatDateInput(date), notes: notes.trim() || null };
      if (isEditing) {
        await updateActivity(activityId, input);
      } else {
        await createActivity(input);
      }
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>{t('activityForm.type')}</Text>
        <TextInput
          style={styles.input}
          value={type}
          onChangeText={setType}
          onFocus={() => setTypeFocused(true)}
          // Delayed so a tap on a suggestion row (which blurs this input first)
          // still lands before the list unmounts.
          onBlur={() => setTimeout(() => setTypeFocused(false), 150)}
          placeholder={t('activityForm.typePlaceholder')}
          autoCapitalize="words"
        />
        {typeFocused && suggestions.length > 0 ? (
          <View style={styles.suggestions}>
            {suggestions.map((suggestion) => (
              <Pressable
                key={suggestion}
                style={styles.suggestionRow}
                onPress={() => setType(suggestion)}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Text style={styles.label}>{t('activityForm.date')}</Text>
        <Pressable style={styles.input} onPress={() => setShowDatePicker(true)}>
          <Text>{date.toLocaleDateString()}</Text>
        </Pressable>
        {showDatePicker ? (
          <>
            <DateTimePicker
              value={date}
              mode="date"
              onValueChange={(_event, selectedDate) => {
                if (selectedDate) setDate(selectedDate);
              }}
              onDismiss={() => setShowDatePicker(false)}
            />
            {Platform.OS === 'ios' ? (
              <Pressable style={styles.doneButton} onPress={() => setShowDatePicker(false)}>
                <Text style={styles.doneButtonText}>{t('activityForm.done')}</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}

        <Text style={styles.label}>{t('activityForm.notes')}</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('activityForm.notesPlaceholder')}
          multiline
        />

        <Pressable
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
        >
          <Text style={styles.saveButtonText}>{t('activityForm.save')}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16 },
  label: { fontSize: 13, color: '#666', marginTop: 16, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  notesInput: { minHeight: 90, textAlignVertical: 'top' },
  suggestions: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    overflow: 'hidden',
  },
  suggestionRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  suggestionText: { fontSize: 15 },
  saveButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  doneButton: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 12 },
  doneButtonText: { color: '#2E7D32', fontSize: 15, fontWeight: '600' },
});
