import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MapPin,
  HelpCircle,
  LogOut,
  ChevronRight,
  Volume2,
  Vibrate,
  Globe,
} from 'lucide-react'
import { AppHeader } from '@/components/AppHeader'
import { BottomNav } from '@/components/BottomNav'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/contexts/AuthContext'
import { stopAlarm } from '@/lib/alarmPlayer'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [soundEnabled, setSoundEnabled] = useState(true)
  const [vibrationEnabled, setVibrationEnabled] = useState(true)
  const [language, setLanguage] = useState('English')
  const [gpsStatus, setGpsStatus] = useState('Checking...')

  // ================= LOAD SETTINGS
  useEffect(() => {
    setSoundEnabled(localStorage.getItem('mg_sound') !== 'false')
    setVibrationEnabled(localStorage.getItem('mg_vibration') !== 'false')
    setLanguage(localStorage.getItem('mg_language') || 'English')

    checkGPS()
  }, [])

  // ================= SAVE
  useEffect(() => {
    localStorage.setItem('mg_sound', String(soundEnabled))
  }, [soundEnabled])

  useEffect(() => {
    localStorage.setItem('mg_vibration', String(vibrationEnabled))
  }, [vibrationEnabled])

  useEffect(() => {
    localStorage.setItem('mg_language', language)
  }, [language])

  // ================= GPS CHECK
  function checkGPS() {
    if (!navigator.geolocation) {
      setGpsStatus('Not Supported')
      return
    }

    navigator.geolocation.getCurrentPosition(
      () => setGpsStatus('Enabled'),
      () => setGpsStatus('Permission Denied')
    )
  }

  // ================= LOGOUT
  async function handleLogout() {
    stopAlarm()
    await logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader title="Settings" />

      <main className="p-4 space-y-6">

        {/* LOCATION */}
<div className="bg-card rounded-xl border overflow-hidden">
  <div
    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-accent"
    onClick={() => {
      // trigger permission popup
      if (!navigator.geolocation) {
        setGpsStatus('Not Supported')
        return
      }

      navigator.geolocation.getCurrentPosition(
        () => setGpsStatus('Enabled'),
        () => setGpsStatus('Permission Denied')
      )

      // 🔥 buka setting lokasi (works on most mobile browsers / PWA)
      window.open('app-settings:', '_blank')
    }}
  >
    <MapPin className="w-5 h-5" />

    <div className="flex-1">
      <div className="font-medium">Location Services</div>
      <div className="text-sm text-muted-foreground">
        {gpsStatus}
      </div>
    </div>

    <ChevronRight className="w-5 h-5 text-muted-foreground" />
  </div>
</div>


        {/* SOUND */}
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="flex items-center gap-4 p-4 border-b">
            <Volume2 className="w-5 h-5" />
            <div className="flex-1 font-medium">Alert Sounds</div>
            <Switch
              checked={soundEnabled}
              onCheckedChange={(v) => {
                setSoundEnabled(v)
                if (!v) stopAlarm()
              }}
            />
          </div>

          <div className="flex items-center gap-4 p-4">
            <Vibrate className="w-5 h-5" />
            <div className="flex-1 font-medium">Vibration</div>
            <Switch
              checked={vibrationEnabled}
              onCheckedChange={setVibrationEnabled}
            />
          </div>
        </div>

        {/* LANGUAGE */}
        <div className="bg-card rounded-xl border overflow-hidden">
          <div
            className="flex items-center gap-4 p-4 cursor-pointer hover:bg-accent"
            onClick={() =>
              setLanguage(prev =>
                prev === 'English' ? 'Indonesia' : 'English'
              )
            }
          >
            <Globe className="w-5 h-5" />
            <div className="flex-1">
              <div className="font-medium">Language</div>
              <div className="text-sm text-muted-foreground">
                {language}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>

        {/* HELP */}
        <div className="bg-card rounded-xl border overflow-hidden">
          <div
            className="flex items-center gap-4 p-4 cursor-pointer hover:bg-accent"
            onClick={() =>
              window.open(
                'https://mineguardian-docs.vercel.app',
                '_blank'
              )
            }
          >
            <HelpCircle className="w-5 h-5" />
            <div className="flex-1 font-medium">
              Help & Documentation
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>

        {/* LOGOUT */}
        <Button
          variant="destructive"
          size="lg"
          className="w-full"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Sign Out
        </Button>

      </main>

      <BottomNav />
    </div>
  )
}
