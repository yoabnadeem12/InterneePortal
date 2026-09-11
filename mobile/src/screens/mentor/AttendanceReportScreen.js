import React, {useState, useCallback, useMemo} from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
} from 'react-native';
import {Text, ActivityIndicator, Searchbar, Button} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useFocusEffect} from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import StatusBadge from '../../components/StatusBadge';
import {getMentorAttendance, getInterns} from '../../api/apiClient';
import {formatTimePKT, formatDatePKT, getTodayPKT, getDaysAgoPKT} from '../../utils/timeUtils';
import {API_BASE_URL} from '../../config';

const getPhotoUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url.replace(/^http:\/\/(localhost|127\.0\.0\.1):5000/, API_BASE_URL);
  }
  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES  = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CalendarModal = ({visible, selectedDate, onSelectDate, onClose}) => {
  const selectedDateObj = useMemo(() => {
    return new Date(selectedDate + 'T00:00:00');
  }, [selectedDate]);

  const [currentYear, setCurrentYear]   = useState(selectedDateObj.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(selectedDateObj.getMonth());

  const todayStr = useMemo(() => getTodayPKT(), []);
  const todayObj = useMemo(() => new Date(), []);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentYear === todayObj.getFullYear() && currentMonth >= todayObj.getMonth()) {
      return;
    }
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const daysGrid = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth   = new Date(currentYear, currentMonth + 1, 0).getDate();

    const grid = [];

    for (let i = 0; i < firstDayIndex; i++) {
      grid.push({day: null, key: `empty-${i}`});
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const dayStr   = String(d).padStart(2, '0');
      const fullDateStr = `${currentYear}-${monthStr}-${dayStr}`;
      const isFuture = fullDateStr > todayStr;
      const isSelected = fullDateStr === selectedDate;
      const isToday    = fullDateStr === todayStr;

      grid.push({
        day: d,
        fullDateStr,
        isFuture,
        isSelected,
        isToday,
        key: fullDateStr,
      });
    }

    return grid;
  }, [currentYear, currentMonth, selectedDate, todayStr]);

  const canGoNext = currentYear < todayObj.getFullYear() || (currentYear === todayObj.getFullYear() && currentMonth < todayObj.getMonth());

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.calendarCard}>
          <View style={styles.calHeader}>
            <TouchableOpacity
              style={styles.calNavBtn}
              activeOpacity={0.7}
              onPress={handlePrevMonth}>
              <MaterialCommunityIcons name="chevron-left" size={24} color="#047857" />
            </TouchableOpacity>

            <View style={{alignItems: 'center'}}>
              <Text style={styles.calMonthText}>
                {MONTH_NAMES[currentMonth]} {currentYear}
              </Text>
              <Text style={styles.calHintText}>Tap any day to view attendance</Text>
            </View>

            <TouchableOpacity
              style={[styles.calNavBtn, !canGoNext && {opacity: 0.3}]}
              activeOpacity={0.7}
              disabled={!canGoNext}
              onPress={handleNextMonth}>
              <MaterialCommunityIcons name="chevron-right" size={24} color={canGoNext ? '#047857' : '#D1D5DB'} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {DAYS_OF_WEEK.map(dw => (
              <Text key={dw} style={styles.weekDayLabel}>{dw}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {daysGrid.map(item => {
              if (!item.day) {
                return <View key={item.key} style={styles.daySlot} />;
              }

              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.daySlot,
                    item.isSelected && styles.daySlotSelected,
                    item.isToday && !item.isSelected && styles.daySlotToday,
                  ]}
                  activeOpacity={0.7}
                  disabled={item.isFuture}
                  onPress={() => {
                    onSelectDate(item.fullDateStr);
                    onClose();
                  }}>
                  <Text
                    style={[
                      styles.dayText,
                      item.isFuture && styles.dayTextFuture,
                      item.isSelected && styles.dayTextSelected,
                      item.isToday && !item.isSelected && styles.dayTextToday,
                    ]}>
                    {item.day}
                  </Text>
                  {item.isToday && !item.isSelected && (
                    <View style={styles.todayDot} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.calActions}>
            <Button
              mode="text"
              textColor="#047857"
              onPress={() => {
                onSelectDate(todayStr);
                onClose();
              }}>
              Jump to Today
            </Button>
            <Button
              mode="outlined"
              textColor="#78716C"
              style={{borderColor: '#EAE2D5'}}
              onPress={onClose}>
              Cancel
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const DateFilter = ({selected, onSelect, onOpenCalendar}) => {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    dates.push(getDaysAgoPKT(i));
  }

  const isCustomDate = !dates.includes(selected);

  return (
    <View style={styles.filterSection}>
      <View style={styles.calendarHeaderRow}>
        <View style={styles.selectedDateBadge}>
          <MaterialCommunityIcons name="calendar-month-outline" size={18} color="#047857" />
          <Text style={styles.selectedDateText}>
            {formatDatePKT(selected)} (PKT)
          </Text>
        </View>

        <TouchableOpacity
          style={styles.calendarButton}
          activeOpacity={0.8}
          onPress={onOpenCalendar}>
          <MaterialCommunityIcons name="calendar-search" size={18} color="#fff" />
          <Text style={styles.calendarButtonText}>Pick Date</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        horizontal
        data={isCustomDate ? [selected, ...dates] : dates}
        keyExtractor={d => d}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateFilters}
        renderItem={({item}) => {
          const isSelected = item === selected;
          const label = item === dates[0] ? 'Today' : item.slice(5);
          return (
            <TouchableOpacity
              style={[styles.dateChip, isSelected && styles.dateChipSelected]}
              onPress={() => onSelect(item)}>
              <Text style={[styles.dateChipText, isSelected && styles.dateChipTextSelected]}>
                {item === selected && isCustomDate ? `?? ${item}` : label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

const AttendanceRow = ({record, onPreviewPhoto}) => {
  const inPhotoUrl = getPhotoUrl(record.checkInPhotoUrl);
  const outPhotoUrl = getPhotoUrl(record.checkOutPhotoUrl);
  const hasPhotos = !!(inPhotoUrl || outPhotoUrl);

  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <View style={styles.rowLeft}>
          {inPhotoUrl ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                onPreviewPhoto &&
                onPreviewPhoto({
                  url: inPhotoUrl,
                  name: record.internName,
                  type: 'Check-In',
                  time: record.checkInTime,
                  inUrl: inPhotoUrl,
                  outUrl: outPhotoUrl,
                  inTime: record.checkInTime,
                  outTime: record.checkOutTime,
                })
              }>
              <Image
                source={{uri: inPhotoUrl}}
                style={styles.rowAvatarPhoto}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.rowAvatar}>
              <Text style={styles.rowAvatarText}>
                {record.internName?.[0]}
              </Text>
            </View>
          )}
          <View style={styles.rowInfo}>
            <Text style={styles.rowName}>{record.internName}</Text>
            <Text style={styles.rowUsername}>@{record.internUsername}</Text>
          </View>
        </View>
        <View style={styles.rowRight}>
          <StatusBadge status={record.overallStatus} />
          {record.checkInTime ? (
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4}}>
              <MaterialCommunityIcons name="clock-outline" size={13} color="#78716C" />
              <Text style={styles.rowTime}>
                {formatTimePKT(record.checkInTime)}
                {record.checkOutTime
                  ? ` - ${formatTimePKT(record.checkOutTime)}`
                  : ' - Incomplete'}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Captured Verification Photos Strip */}
      {hasPhotos && (
        <View style={styles.photoStrip}>
          <Text style={styles.photoStripLabel}>Captured Photos:</Text>
          <View style={styles.photoThumbList}>
            {inPhotoUrl && (
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.photoThumbCard}
                onPress={() =>
                  onPreviewPhoto &&
                  onPreviewPhoto({
                    url: inPhotoUrl,
                    name: record.internName,
                    type: 'Check-In',
                    time: record.checkInTime,
                    inUrl: inPhotoUrl,
                    outUrl: outPhotoUrl,
                    inTime: record.checkInTime,
                    outTime: record.checkOutTime,
                  })
                }>
                <Image source={{uri: inPhotoUrl}} style={styles.photoThumbImg} resizeMode="cover" />
                <View style={[styles.photoTag, {backgroundColor: '#047857'}]}>
                  <MaterialCommunityIcons name="login" size={10} color="#FFFFFF" style={{marginRight: 2}} />
                  <Text style={styles.photoTagText}>CHECK-IN</Text>
                </View>
              </TouchableOpacity>
            )}

            {outPhotoUrl && (
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.photoThumbCard}
                onPress={() =>
                  onPreviewPhoto &&
                  onPreviewPhoto({
                    url: outPhotoUrl,
                    name: record.internName,
                    type: 'Check-Out',
                    time: record.checkOutTime,
                    inUrl: inPhotoUrl,
                    outUrl: outPhotoUrl,
                    inTime: record.checkInTime,
                    outTime: record.checkOutTime,
                  })
                }>
                <Image source={{uri: outPhotoUrl}} style={styles.photoThumbImg} resizeMode="cover" />
                <View style={[styles.photoTag, {backgroundColor: '#2563EB'}]}>
                  <MaterialCommunityIcons name="logout" size={10} color="#FFFFFF" style={{marginRight: 2}} />
                  <Text style={styles.photoTagText}>CHECK-OUT</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

export default function AttendanceReportScreen({navigation}) {
  const today = getTodayPKT();
  const [date, setDate]                     = useState(today);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [previewPhoto, setPreviewPhoto]       = useState(null);
  const [records, setRecords]               = useState([]);
  const [interns, setInterns]               = useState([]);
  const [search, setSearch]                 = useState('');
  const [loading, setLoading]               = useState(true);

  const load = async (d) => {
    setLoading(true);
    try {
      const [attRes, intRes] = await Promise.all([
        getMentorAttendance(d),
        getInterns(),
      ]);
      setRecords(attRes.data || []);
      setInterns(intRes.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { load(date); }, [date]));

  const handleDateChange = d => { setDate(d); load(d); };

  const fullList = interns
    .filter(i =>
      !search ||
      i.firstName.toLowerCase().includes(search.toLowerCase()) ||
      i.lastName.toLowerCase().includes(search.toLowerCase())
    )
    .map(intern => {
      const rec = records.find(r => r.userId === intern.id);
      return rec ?? {
        id: `absent-${intern.id}`,
        userId: intern.id,
        internName: `${intern.firstName} ${intern.lastName}`,
        internUsername: intern.username,
        date,
        checkInStatus: 'NotYet',
        checkOutStatus: 'NotYet',
        overallStatus: 'Absent',
      };
    });

  const presentCount    = fullList.filter(r => r.overallStatus === 'Present').length;
  const abscentCount    = fullList.filter(r => r.overallStatus === 'Absent').length;
  const incompleteCount = fullList.filter(r => r.overallStatus === 'Incomplete').length;

  return (
    <View style={styles.root}>
      <AppHeader title="Attendance Report" navigation={navigation} />

      <DateFilter
        selected={date}
        onSelect={handleDateChange}
        onOpenCalendar={() => setCalendarVisible(true)}
      />

      <CalendarModal
        visible={calendarVisible}
        selectedDate={date}
        onSelectDate={handleDateChange}
        onClose={() => setCalendarVisible(false)}
      />

      {/* Photo Preview Modal */}
      <Modal
        visible={!!previewPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewPhoto(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.photoPreviewCard}>
            <View style={styles.photoPreviewHeader}>
              <Text style={styles.photoPreviewTitle}>{previewPhoto?.name}</Text>
              <Text style={styles.photoPreviewSubtitle}>
                {previewPhoto?.type} Photo Capture
                {previewPhoto?.time ? ` • ${formatTimePKT(previewPhoto.time)}` : ''}
              </Text>
            </View>

            {/* If both Check-In and Check-Out photos exist, provide toggle switch */}
            {previewPhoto?.inUrl && previewPhoto?.outUrl && (
              <View style={styles.modalToggleRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.modalToggleBtn,
                    previewPhoto.type === 'Check-In' && styles.modalToggleBtnActiveIn,
                  ]}
                  onPress={() =>
                    setPreviewPhoto(prev => ({
                      ...prev,
                      type: 'Check-In',
                      url: prev.inUrl,
                      time: prev.inTime,
                    }))
                  }>
                  <MaterialCommunityIcons
                    name="login"
                    size={14}
                    color={previewPhoto.type === 'Check-In' ? '#FFFFFF' : '#047857'}
                    style={{marginRight: 4}}
                  />
                  <Text
                    style={[
                      styles.modalToggleText,
                      previewPhoto.type === 'Check-In' && styles.modalToggleTextActive,
                    ]}>
                    Check-In
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.modalToggleBtn,
                    previewPhoto.type === 'Check-Out' && styles.modalToggleBtnActiveOut,
                  ]}
                  onPress={() =>
                    setPreviewPhoto(prev => ({
                      ...prev,
                      type: 'Check-Out',
                      url: prev.outUrl,
                      time: prev.outTime,
                    }))
                  }>
                  <MaterialCommunityIcons
                    name="logout"
                    size={14}
                    color={previewPhoto.type === 'Check-Out' ? '#FFFFFF' : '#2563EB'}
                    style={{marginRight: 4}}
                  />
                  <Text
                    style={[
                      styles.modalToggleText,
                      previewPhoto.type === 'Check-Out' && styles.modalToggleTextActive,
                    ]}>
                    Check-Out
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {previewPhoto?.url ? (
              <Image
                source={{uri: previewPhoto.url}}
                style={styles.photoPreviewImage}
                resizeMode="cover"
              />
            ) : null}
            <Button
              mode="contained"
              style={styles.closePreviewBtn}
              buttonColor="#047857"
              textColor="#FFFFFF"
              onPress={() => setPreviewPhoto(null)}>
              Close
            </Button>
          </View>
        </View>
      </Modal>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryBox, {borderTopColor: '#16A34A'}]}>
          <Text style={[styles.summaryVal, {color: '#16A34A'}]}>{presentCount}</Text>
          <Text style={styles.summaryLbl}>Present</Text>
        </View>
        <View style={[styles.summaryBox, {borderTopColor: '#047857'}]}>
          <Text style={[styles.summaryVal, {color: '#047857'}]}>{incompleteCount}</Text>
          <Text style={styles.summaryLbl}>Incomplete</Text>
        </View>
        <View style={[styles.summaryBox, {borderTopColor: '#DC2626'}]}>
          <Text style={[styles.summaryVal, {color: '#DC2626'}]}>{abscentCount}</Text>
          <Text style={styles.summaryLbl}>Absent</Text>
        </View>
      </View>

      <Searchbar
        placeholder="Search intern..."
        value={search}
        onChangeText={setSearch}
        style={styles.search}
        inputStyle={{color: '#1C1917'}}
        iconColor="#047857"
        placeholderTextColor="#78716C"
      />

      {loading ? (
        <ActivityIndicator color="#047857" style={styles.loader} />
      ) : (
        <FlatList
          data={fullList}
          keyExtractor={item => item.id.toString()}
          renderItem={({item}) => (
            <AttendanceRow record={item} onPreviewPhoto={photoData => setPreviewPhoto(photoData)} />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={40} color="#78716C" style={{marginBottom: 8}} />
              <Text style={styles.emptyText}>No records found for this date</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:          {flex: 1, backgroundColor: '#FBF9F5'},
  filterSection: {backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#EAE2D5', paddingBottom: 8},
  calendarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  selectedDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  selectedDateText: {
    color: '#1C1917',
    fontSize: 13,
    fontWeight: '700',
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#047857',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    elevation: 2,
  },
  calendarButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  dateFilters: {paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 8},
  dateChip: {
    backgroundColor: '#FAF7F0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#EAE2D5',
  },
  dateChipSelected: {backgroundColor: '#047857', borderColor: '#047857'},
  dateChipText:     {color: '#78716C', fontSize: 12, fontWeight: '600'},
  dateChipTextSelected: {color: '#fff', fontWeight: '700'},
  summaryRow: {flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginTop: 12, marginBottom: 12},
  summaryBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: '#EAE2D5',
    alignItems: 'center',
    elevation: 2,
  },
  summaryVal:  {fontSize: 22, fontWeight: '800'},
  summaryLbl:  {color: '#78716C', fontSize: 11, fontWeight: '600', marginTop: 2},
  search: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EAE2D5',
    elevation: 2,
  },
  loader:      {marginTop: 40},
  list:        {paddingHorizontal: 16, paddingBottom: 40},
  row: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EAE2D5',
    elevation: 2,
    shadowColor: '#78716C',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft:     {flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1},
  rowAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  rowAvatarText: {color: '#047857', fontWeight: '700', fontSize: 16},
  rowInfo:     {flex: 1},
  rowName:     {color: '#1C1917', fontSize: 14, fontWeight: '700'},
  rowUsername: {color: '#047857', fontSize: 12, fontWeight: '600'},
  rowRight:    {alignItems: 'flex-end', gap: 4},
  rowTime:     {color: '#78716C', fontSize: 11, fontWeight: '500'},
  empty:       {alignItems: 'center', paddingTop: 60},
  emptyText:   {color: '#78716C', fontSize: 16},

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: '#EAE2D5',
    elevation: 8,
    shadowColor: '#1C1917',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  calHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calNavBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  calMonthText: {
    color: '#1C1917',
    fontSize: 16,
    fontWeight: '800',
  },
  calHintText: {
    color: '#78716C',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EAE2D5',
    marginBottom: 8,
  },
  weekDayLabel: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '700',
    width: 38,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  daySlot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 3,
  },
  daySlotSelected: {
    backgroundColor: '#047857',
    elevation: 2,
  },
  daySlotToday: {
    borderWidth: 1.5,
    borderColor: '#047857',
    backgroundColor: '#ECFDF5',
  },
  dayText: {
    color: '#1C1917',
    fontSize: 13,
    fontWeight: '600',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dayTextToday: {
    color: '#047857',
    fontWeight: '700',
  },
  dayTextFuture: {
    color: '#D1D5DB',
  },
  todayDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#047857',
  },
  calActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#EAE2D5',
    paddingTop: 12,
  },
  rowAvatarPhoto: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: '#047857',
    backgroundColor: '#E5E7EB',
  },
  photoStrip: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F0E8',
  },
  photoStripLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78716C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  photoThumbList: {
    flexDirection: 'row',
    gap: 12,
  },
  photoThumbCard: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#EAE2D5',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  photoThumbImg: {
    width: 68,
    height: 68,
    backgroundColor: '#E5E7EB',
  },
  photoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
    width: '100%',
  },
  photoTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  modalToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
    gap: 4,
  },
  modalToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  modalToggleBtnActiveIn: {
    backgroundColor: '#047857',
  },
  modalToggleBtnActiveOut: {
    backgroundColor: '#2563EB',
  },
  modalToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  modalToggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  photoPreviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    width: '90%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAE2D5',
    elevation: 8,
  },
  photoPreviewHeader: {
    alignItems: 'center',
    marginBottom: 14,
  },
  photoPreviewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1917',
  },
  photoPreviewSubtitle: {
    fontSize: 12,
    color: '#78716C',
    marginTop: 2,
  },
  photoPreviewImage: {
    width: 260,
    height: 320,
    borderRadius: 14,
    marginBottom: 16,
    backgroundColor: '#000',
  },
  closePreviewBtn: {
    width: '100%',
    borderRadius: 12,
  },
});