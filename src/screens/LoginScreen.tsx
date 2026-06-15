import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {Card, Text, TextInput, Button} from 'react-native-paper';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import {ORANGE} from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

// Dummy device registration states: 'approved' | 'pending' | 'rejected'
const DEVICE_STATUS: 'approved' | 'pending' | 'rejected' = 'approved';

const statusConfig = {
  approved: {
    label: 'Device Approved',
    icon: 'shield-check',
    bg: '#E8F5E9',
    text: '#2E7D32',
    border: '#A5D6A7',
  },
  pending: {
    label: 'Approval Pending',
    icon: 'shield-alert',
    bg: '#FFF8E1',
    text: '#F57F17',
    border: '#FFE082',
  },
  rejected: {
    label: 'Device Rejected',
    icon: 'shield-off',
    bg: '#FFEBEE',
    text: '#C62828',
    border: '#EF9A9A',
  },
};

export default function LoginScreen({navigation}: Props) {
  const [councilId, setCouncilId] = useState('');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);

  const status = statusConfig[DEVICE_STATUS];
  const isRestricted = DEVICE_STATUS !== 'approved';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled">
        {/* Orange top band */}
        <View style={styles.topBand} />

        {/* Logo + App name */}
        <View style={styles.logoWrapper}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🏛️</Text>
          </View>
          <Text style={styles.appName}>Property Survey App</Text>
          <Text style={styles.appSubtitle}>Municipal Property Management</Text>
        </View>

        {/* Login Card */}
        <Card style={styles.card} elevation={4}>
          <Card.Content style={styles.cardContent}>

            <Text variant="headlineSmall" style={styles.cardTitle}>
              Sign In
            </Text>
            <Text variant="bodySmall" style={styles.cardSubtitle}>
              Enter your credentials to continue
            </Text>

            {/* ── Device Registration Status ── */}
            <View
              style={[
                styles.statusBox,
                {backgroundColor: status.bg, borderColor: status.border},
              ]}>
              <View style={styles.statusRow}>
                <Text style={[styles.statusDot, {color: status.text}]}>●</Text>
                <Text style={[styles.statusLabel, {color: status.text}]}>
                  Device Registration Status
                </Text>
              </View>
              <View style={styles.statusChipRow}>
                <View
                  style={[styles.statusChip, {backgroundColor: status.text}]}>
                  <Text style={styles.statusChipText}>{status.label}</Text>
                </View>
                <Text style={[styles.imeiNote, {color: status.text}]}>
                  IMEI: ••••••••••••••••
                </Text>
              </View>
            </View>

            {/* ── Restricted Access Banner ── */}
            {isRestricted && (
              <View style={styles.restrictedBanner}>
                <Text style={styles.restrictedIcon}>🔒</Text>
                <View style={styles.restrictedTextWrapper}>
                  <Text style={styles.restrictedTitle}>Access Restricted</Text>
                  <Text style={styles.restrictedMsg}>
                    {DEVICE_STATUS === 'pending'
                      ? 'Your device is awaiting admin approval. Login is disabled until your device is approved.'
                      : 'Your device registration has been rejected. Contact your administrator for assistance.'}
                  </Text>
                </View>
              </View>
            )}

            {/* ── Council ID ── */}
            <TextInput
              label="Council ID"
              value={councilId}
              onChangeText={setCouncilId}
              mode="outlined"
              keyboardType="default"
              left={<TextInput.Icon icon="office-building" color={ORANGE} />}
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor={ORANGE}
              disabled={isRestricted}
            />

            {/* ── User ID ── */}
            <TextInput
              label="User ID"
              value={userId}
              onChangeText={setUserId}
              mode="outlined"
              keyboardType="default"
              left={<TextInput.Icon icon="account" color={ORANGE} />}
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor={ORANGE}
              disabled={isRestricted}
            />

            {/* ── Password ── */}
            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry={secureText}
              left={<TextInput.Icon icon="lock" color={ORANGE} />}
              right={
                <TextInput.Icon
                  icon={secureText ? 'eye-off' : 'eye'}
                  onPress={() => setSecureText(!secureText)}
                />
              }
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor={ORANGE}
              disabled={isRestricted}
            />

            {/* ── Login Button ── */}
            <Button
              mode="contained"
              onPress={() => navigation.navigate('PropertySurvey')}
              style={styles.loginButton}
              contentStyle={styles.loginButtonContent}
              labelStyle={styles.loginButtonLabel}
              buttonColor={isRestricted ? '#BDBDBD' : ORANGE}
              disabled={isRestricted}>
              LOGIN
            </Button>

            <Text style={styles.forgotText}>Forgot Password?</Text>
          </Card.Content>
        </Card>

        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: 32,
  },
  topBand: {
    width: '100%',
    height: 210,
    backgroundColor: ORANGE,
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
    position: 'absolute',
    top: 0,
  },
  logoWrapper: {
    alignItems: 'center',
    marginTop: 48,
    marginBottom: 24,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
  },
  logoEmoji: {
    fontSize: 42,
  },
  appName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginTop: 12,
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  card: {
    width: '88%',
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  cardContent: {
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  cardTitle: {
    fontWeight: '700',
    color: '#212121',
    marginBottom: 4,
  },
  cardSubtitle: {
    color: '#9E9E9E',
    marginBottom: 20,
  },
  // ── Device Status Box ──
  statusBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    fontSize: 10,
    marginRight: 6,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  statusChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusChip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusChipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  imeiNote: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.8,
  },
  // ── Restricted Banner ──
  restrictedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FFCC80',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  restrictedIcon: {
    fontSize: 22,
    marginRight: 10,
    marginTop: 1,
  },
  restrictedTextWrapper: {
    flex: 1,
  },
  restrictedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 4,
  },
  restrictedMsg: {
    fontSize: 12,
    color: '#BF360C',
    lineHeight: 18,
  },
  // ── Inputs ──
  input: {
    marginBottom: 14,
    backgroundColor: '#fff',
  },
  loginButton: {
    borderRadius: 12,
    marginTop: 6,
    elevation: 3,
  },
  loginButtonContent: {
    height: 50,
  },
  loginButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  forgotText: {
    textAlign: 'center',
    marginTop: 16,
    color: ORANGE,
    fontSize: 14,
    fontWeight: '500',
  },
  versionText: {
    marginTop: 24,
    color: '#BDBDBD',
    fontSize: 12,
  },
});
