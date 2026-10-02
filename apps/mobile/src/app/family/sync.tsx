import { pairingFromQr, shortCode } from '@mathaka/core';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SIZE } from '../../a11y/tokens';
import { useTheme } from '../../a11y/useTheme';
import { AppText } from '../../components/AppText';
import { Chip, ChipRow, FamilyButton, Section } from '../../components/family/FamilyUI';
import { Screen } from '../../components/Screen';
import { DEMO_MODE } from '../../config';
import { getRepository } from '../../db/bootstrap';
import { useLoad } from '../../hooks/useLoad';
import { t, type StringKey } from '../../i18n';
import { getCalibration } from '../../services/calibrationService';
import { exportCalibration, importCalibrationFromPicker, importedInfo, type ExportResult } from '../../services/calibrationSync';
import { linkSupported } from '../../services/linkServer';
import { familyPairingQr, getLink, pushLogToFamily, savePairing, setSmsEnabled } from '../../services/linkService';
import { canSendDirect, smsPermission } from '../../services/sms';
import { useAppStore } from '../../store/appStore';

/** Calibration file family -> elder, Wi-Fi pairing, SMS alerts. One screen, by phone role. */
export default function SyncScreen() {
  const lang = useAppStore((s) => s.uiLang);
  const role = useAppStore((s) => s.role);
  const version = useAppStore((s) => s.dataVersion);
  const theme = useTheme();
  const [exported, setExported] = useState<ExportResult | null>(null);
  const [msg, setMsg] = useState('');
  const [scanning, setScanning] = useState(false);
  const [perm, requestPerm] = useCameraPermissions();

  const { data } = useLoad(async () => {
    const repo = await getRepository();
    const people = await repo.listPeople();
    const family = people.find((p) => p.role === 'family') ?? people[0];
    return {
      cal: await getCalibration(),
      imported: await importedInfo(),
      link: await getLink(),
      pairQr: role === 'family' ? await familyPairingQr(family?.name ?? 'family') : null,
      smsDirect: canSendDirect(),
    };
  }, [version, role]);
  if (!data) return <Screen>{null}</Screen>;
  const time = (iso?: string) => (iso ? iso.replace('T', ' ').slice(0, 16) : '—');

  const doExport = async () => {
    setMsg('');
    try {
      setExported(await exportCalibration());
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const doImport = async () => {
    setMsg('');
    const r = await importCalibrationFromPicker();
    if (r.ok) setMsg(t(lang, 'sync.imported', { v: r.info.version, code: r.info.code }));
    else if (r.reason !== 'cancelled') setMsg(t(lang, `sync.reason.${r.reason}` as StringKey));
  };

  const onScanned = async (text: string) => {
    const p = pairingFromQr(text);
    if (!p) return;
    setScanning(false);
    await savePairing(p);
    setMsg(t(lang, 'sync.paired', { name: p.family, host: p.host }));
  };

  return (
    <Screen>
      <AppText lang={lang} size={SIZE.familyTitle} bold accessibilityRole="header">
        {t(lang, 'sync.title')}
      </AppText>

      {role !== 'elder' && (
        <>
          <Section title={t(lang, 'sync.export')} lang={lang}>
            <AppText lang={lang} size={16} color={theme.textMuted}>{t(lang, 'sync.exportHint')}</AppText>
            {!data.cal.approvedBy ? (
              <AppText lang={lang} size={16} color={theme.missed}>{t(lang, 'sync.notApproved')}</AppText>
            ) : (
              <FamilyButton lang={lang} primary label={t(lang, 'sync.export')} onPress={doExport} />
            )}
            {exported && (
              <View style={styles.center} accessibilityLiveRegion="polite">
                <AppText lang={lang} size={16}>{t(lang, 'sync.exported', { name: exported.name, code: exported.code })}</AppText>
                <View style={styles.qr}>
                  <QRCode value={`mathaka-calibration:${exported.sha256}`} size={160} />
                </View>
                <AppText lang="en" size={26} bold>{exported.code}</AppText>
                <AppText lang={lang} size={15} color={theme.textMuted}>{t(lang, 'sync.codeHint')}</AppText>
              </View>
            )}
          </Section>

          <Section title={t(lang, 'sync.wifi')} lang={lang}>
            <AppText lang={lang} size={16} color={theme.textMuted}>{t(lang, 'sync.wifiHint')}</AppText>
            {!linkSupported() ? (
              <AppText lang={lang} size={16}>{t(lang, 'sync.needsBuild')}</AppText>
            ) : data.pairQr ? (
              <View style={styles.center}>
                <View style={styles.qr}>
                  <QRCode value={data.pairQr} size={200} />
                </View>
                <AppText lang={lang} size={16}>{t(lang, 'sync.pairQr')}</AppText>
              </View>
            ) : (
              <AppText lang={lang} size={16} color={theme.missed}>{t(lang, 'sync.noWifi')}</AppText>
            )}
            <AppText lang={lang} size={15} color={theme.textMuted}>{t(lang, 'sync.lastReceived', { time: time(data.link.lastReceivedAt) })}</AppText>
          </Section>
        </>
      )}

      {role === 'elder' && (
        <>
          <Section title={t(lang, 'sync.import')} lang={lang}>
            <AppText lang={lang} size={16}>
              {data.imported ? t(lang, 'sync.imported', { v: data.imported.version, code: data.imported.code }) : t(lang, 'sync.importNone')}
            </AppText>
            <FamilyButton lang={lang} primary label={t(lang, 'sync.import')} onPress={doImport} />
          </Section>

          <Section title={t(lang, 'sync.wifi')} lang={lang}>
            <AppText lang={lang} size={16}>
              {data.link.pairing ? t(lang, 'sync.paired', { name: data.link.pairing.family, host: data.link.pairing.host }) : t(lang, 'sync.notPaired')}
            </AppText>
            {scanning ? (
              perm?.granted ? (
                <View style={styles.camera}>
                  <AppText lang={lang} size={16}>{t(lang, 'sync.scanHint')}</AppText>
                  <CameraView
                    style={styles.cameraView}
                    facing="back"
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    onBarcodeScanned={({ data: text }) => void onScanned(text)}
                  />
                  <FamilyButton lang={lang} label={t(lang, 'common.cancel')} onPress={() => setScanning(false)} />
                </View>
              ) : (
                <FamilyButton lang={lang} label={t(lang, 'sync.camera')} onPress={() => void requestPerm()} />
              )
            ) : (
              <FamilyButton lang={lang} label={t(lang, 'sync.scan')} onPress={() => setScanning(true)} />
            )}
            {data.link.pairing && (
              <FamilyButton
                lang={lang}
                label={t(lang, 'sync.sendNow')}
                onPress={async () => setMsg(t(lang, (await pushLogToFamily()) ? 'sync.sent' : 'sync.notSent'))}
              />
            )}
            <AppText lang={lang} size={15} color={theme.textMuted}>{t(lang, 'sync.lastSent', { time: time(data.link.lastSentAt) })}</AppText>
          </Section>

          <Section title={t(lang, 'sync.sms')} lang={lang}>
            <AppText lang={lang} size={16} color={theme.textMuted}>{t(lang, 'sync.smsHint')}</AppText>
            {DEMO_MODE && <AppText lang={lang} size={15} color={theme.missed}>{t(lang, 'sync.smsDemo')}</AppText>}
            <ChipRow label={t(lang, 'sync.sms')}>
              <Chip lang={lang} label={t(lang, 'common.on')} selected={data.link.smsEnabled} onPress={() => void setSmsEnabled(true)} />
              <Chip lang={lang} label={t(lang, 'common.off')} selected={!data.link.smsEnabled} onPress={() => void setSmsEnabled(false)} />
            </ChipRow>
            <AppText lang={lang} size={15}>{t(lang, data.smsDirect ? 'sync.smsOk' : 'sync.smsNo')}</AppText>
            {!data.smsDirect && <FamilyButton lang={lang} label={t(lang, 'sync.smsAllow')} onPress={() => void smsPermission().then(() => useAppStore.getState().bumpData())} />}
          </Section>
        </>
      )}

      {!!msg && (
        <AppText lang={lang} size={17} bold accessibilityLiveRegion="polite">
          {msg}
        </AppText>
      )}
      {data.imported && role !== 'elder' && <AppText lang="en" size={13}>{shortCode(data.imported.sha256)}</AppText>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: 8 },
  qr: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12 },
  camera: { gap: 10 },
  cameraView: { width: '100%', aspectRatio: 1, borderRadius: 16, overflow: 'hidden' },
});
