import React, {useState} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  HelperText,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../components/AppHeader';
import {
  createDepartment,
  updateDepartment,
} from '../../api/apiClient';

export default function DepartmentFormScreen({navigation, route}) {
  const editDept = route.params?.dept ?? null;
  const isEdit   = !!editDept;

  const [name, setName]         = useState(editDept?.name ?? '');
  const [description, setDesc]  = useState(editDept?.description ?? '');
  const [latitude, setLat]      = useState(editDept?.latitude?.toString() ?? '');
  const [longitude, setLng]     = useState(editDept?.longitude?.toString() ?? '');
  const [radiusMeters, setRadius] = useState(
    editDept?.radiusMeters?.toString() ?? '100'
  );
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState({});

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'Department name is required';

    const lat = parseFloat(latitude);
    if (isNaN(lat) || lat < -90 || lat > 90)
      e.latitude = 'Enter a valid latitude (-90 to 90)';

    const lng = parseFloat(longitude);
    if (isNaN(lng) || lng < -180 || lng > 180)
      e.longitude = 'Enter a valid longitude (-180 to 180)';

    const rad = parseInt(radiusMeters, 10);
    if (isNaN(rad) || rad < 10 || rad > 10000)
      e.radius = 'Radius must be between 10m and 10,000m';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        name:         name.trim(),
        description:  description.trim() || undefined,
        latitude:     parseFloat(latitude),
        longitude:    parseFloat(longitude),
        radiusMeters: parseInt(radiusMeters, 10),
      };

      if (isEdit) {
        await updateDepartment(editDept.id, payload);
        Alert.alert('Success', 'Department updated successfully.');
      } else {
        await createDepartment(payload);
        Alert.alert('Success', 'Department created successfully.');
      }
      navigation.goBack();
    } catch (e) {
      const msg = e?.response?.data?.message ?? 'Operation failed.';
      Alert.alert('Error', msg);
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

          <Text style={styles.sectionTitle}>General Info</Text>

          <TextInput
            label="Department Name *"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
            outlineStyle={styles.outline}
            textColor="#1C1917"
            theme={{colors: {primary: '#047857'}}}
          />
          {errors.name ? <HelperText type="error">{errors.name}</HelperText> : null}

          <TextInput
            label="Description (Optional)"
            value={description}
            onChangeText={setDesc}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
            outlineStyle={styles.outline}
            textColor="#1C1917"
            theme={{colors: {primary: '#047857'}}}
          />

          <Text style={styles.sectionTitle}>Geo-Fence Coordinates</Text>

          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#047857" />
            <Text style={styles.infoText}>
              Set the GPS center and radius for attendance verification. Interns must be within this zone to check in/out.
            </Text>
          </View>

          <TextInput
            label="Latitude * (-90 to 90)"
            value={latitude}
            onChangeText={setLat}
            mode="outlined"
            keyboardType="numeric"
            placeholder="e.g. 24.8607"
            left={<TextInput.Icon icon="map-marker" iconColor="#047857" />}
            style={styles.input}
            outlineStyle={styles.outline}
            textColor="#1C1917"
            theme={{colors: {primary: '#047857'}}}
          />
          {errors.latitude ? <HelperText type="error">{errors.latitude}</HelperText> : null}

          <TextInput
            label="Longitude * (-180 to 180)"
            value={longitude}
            onChangeText={setLng}
            mode="outlined"
            keyboardType="numeric"
            placeholder="e.g. 67.0011"
            left={<TextInput.Icon icon="map-marker" iconColor="#047857" />}
            style={styles.input}
            outlineStyle={styles.outline}
            textColor="#1C1917"
            theme={{colors: {primary: '#047857'}}}
          />
          {errors.longitude ? <HelperText type="error">{errors.longitude}</HelperText> : null}

          <TextInput
            label="Allowed Radius (Meters) *"
            value={radiusMeters}
            onChangeText={setRadius}
            mode="outlined"
            keyboardType="numeric"
            placeholder="e.g. 100"
            left={<TextInput.Icon icon="radius" iconColor="#047857" />}
            style={styles.input}
            outlineStyle={styles.outline}
            textColor="#1C1917"
            theme={{colors: {primary: '#047857'}}}
          />
          {errors.radius ? <HelperText type="error">{errors.radius}</HelperText> : null}

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
  root:         {flex: 1, backgroundColor: '#FBF9F5'},
  scroll:       {padding: 16, paddingBottom: 40},
  sectionTitle: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 14,
    gap: 10,
  },
  infoText: {
    color: '#064E3B',
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  input:        {marginBottom: 6, backgroundColor: '#FAF7F0'},
  outline:      {borderColor: '#E5DDD0', borderRadius: 12},
  saveBtn: {
    marginTop: 24,
    borderRadius: 12,
    backgroundColor: '#047857',
    elevation: 2,
  },
  saveBtnContent: {paddingVertical: 6},
  saveBtnLabel:   {fontSize: 15, fontWeight: '700', color: '#fff'},
});
