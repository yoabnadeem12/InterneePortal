import React, {useState} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {Text, TextInput, Button, HelperText} from 'react-native-paper';
import AppHeader from '../../components/AppHeader';
import {createDepartment, updateDepartment} from '../../api/apiClient';

export default function DepartmentFormScreen({navigation, route}) {
  const editDept = route.params?.dept ?? null;
  const isEdit   = !!editDept;

  const [name, setName]         = useState(editDept?.name ?? '');
  const [lat, setLat]           = useState(editDept?.latitude?.toString() ?? '');
  const [lng, setLng]           = useState(editDept?.longitude?.toString() ?? '');
  const [radius, setRadius]     = useState(editDept?.radiusMeters?.toString() ?? '50');
  const [desc, setDesc]         = useState(editDept?.description ?? '');
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState({});

  const validate = () => {
    const e = {};
    if (!name.trim())         e.name   = 'Department name is required';
    const latN = parseFloat(lat);
    const lngN = parseFloat(lng);
    if (isNaN(latN) || latN < -90  || latN > 90)   e.lat = 'Enter valid latitude  (-90 to 90)';
    if (isNaN(lngN) || lngN < -180 || lngN > 180)  e.lng = 'Enter valid longitude (-180 to 180)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        name:         name.trim(),
        latitude:     parseFloat(lat),
        longitude:    parseFloat(lng),
        radiusMeters: parseFloat(radius) || 50,
        description:  desc.trim() || undefined,
      };
      if (isEdit) {
        await updateDepartment(editDept.id, payload);
        Alert.alert('Success', 'Department updated.');
      } else {
        await createDepartment(payload);
        Alert.alert('Success', 'Department created.');
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Operation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <AppHeader
        title={isEdit ? 'Edit Department' : 'Add Department'}
        navigation={navigation}
        showBack
      />
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll}>

          <Text style={styles.sectionTitle}>Department Details</Text>

          <TextInput
            label="Department Name *"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
            outlineStyle={styles.outline}
            textColor="#E8EAF6"
          />
          {errors.name ? <HelperText type="error">{errors.name}</HelperText> : null}

          <TextInput
            label="Description"
            value={desc}
            onChangeText={setDesc}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
            outlineStyle={styles.outline}
            textColor="#E8EAF6"
          />

          <Text style={styles.sectionTitle}>GPS Coordinates</Text>

          <View style={styles.hint}>
            <Text style={styles.hintText}>
              📍 Enter the exact GPS coordinates of the department location.
              Interns must be within {radius}m to mark attendance.
            </Text>
          </View>

          <TextInput
            label="Latitude *"
            value={lat}
            onChangeText={setLat}
            mode="outlined"
            keyboardType="numeric"
            placeholder="e.g. 33.7294"
            style={styles.input}
            outlineStyle={styles.outline}
            textColor="#E8EAF6"
            left={<TextInput.Icon icon="latitude" />}
          />
          {errors.lat ? <HelperText type="error">{errors.lat}</HelperText> : null}

          <TextInput
            label="Longitude *"
            value={lng}
            onChangeText={setLng}
            mode="outlined"
            keyboardType="numeric"
            placeholder="e.g. 73.0931"
            style={styles.input}
            outlineStyle={styles.outline}
            textColor="#E8EAF6"
            left={<TextInput.Icon icon="longitude" />}
          />
          {errors.lng ? <HelperText type="error">{errors.lng}</HelperText> : null}

          <TextInput
            label="Geo-fence Radius (meters)"
            value={radius}
            onChangeText={setRadius}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
            outlineStyle={styles.outline}
            textColor="#E8EAF6"
            left={<TextInput.Icon icon="radius" />}
          />

          {/* Live preview */}
          {lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng)) ? (
            <View style={styles.previewBox}>
              <Text style={styles.previewLabel}>Coordinates Preview</Text>
              <Text style={styles.previewCoords}>
                📍 {parseFloat(lat).toFixed(6)}, {parseFloat(lng).toFixed(6)}
              </Text>
              <Text style={styles.previewRadius}>
                Geo-fence: {radius || 50}m radius
              </Text>
            </View>
          ) : null}

          <Button
            mode="contained"
            onPress={handleSave}
            loading={loading}
            style={styles.saveBtn}
            contentStyle={styles.saveBtnContent}
            labelStyle={styles.saveBtnLabel}>
            {isEdit ? 'Save Changes' : 'Create Department'}
          </Button>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    {flex: 1, backgroundColor: '#0D0E1A'},
  scroll:  {padding: 16, paddingBottom: 40},
  sectionTitle: {
    color: '#8B8DAA',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 20,
  },
  hint: {
    backgroundColor: '#1A1C33',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#6C63FF33',
  },
  hintText:   {color: '#8B8DAA', fontSize: 12, lineHeight: 18},
  input:      {marginBottom: 6, backgroundColor: '#13152A'},
  outline:    {borderColor: '#3D3F5C', borderRadius: 10},
  previewBox: {
    backgroundColor: '#1A1C33',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#4CAF5033',
  },
  previewLabel:  {color: '#4CAF50', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6},
  previewCoords: {color: '#E8EAF6', fontSize: 15, fontFamily: 'monospace', fontWeight: '700'},
  previewRadius: {color: '#8B8DAA', fontSize: 12, marginTop: 4},
  saveBtn: {
    marginTop: 24,
    borderRadius: 12,
    backgroundColor: '#6C63FF',
  },
  saveBtnContent: {paddingVertical: 6},
  saveBtnLabel:   {fontSize: 15, fontWeight: '700', color: '#fff'},
});
