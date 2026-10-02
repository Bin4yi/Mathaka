import { Redirect } from 'expo-router';
import { useAppStore } from '../store/appStore';

export default function Index() {
  const role = useAppStore((s) => s.role);
  if (role === 'elder') return <Redirect href="/elder" />;
  if (role === 'family') return <Redirect href="/family" />;
  return <Redirect href="/role-picker" />;
}
