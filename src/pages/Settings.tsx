import { Settings as SettingsIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SettingsAccount from './settings/SettingsAccount';
import SettingsClients from './settings/SettingsClients';
import SettingsAI from './settings/SettingsAI';
import SettingsNotifications from './settings/SettingsNotifications';

const Settings = () => (
  <motion.div
    className="max-w-4xl mx-auto space-y-6"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className="flex items-center gap-2">
      <SettingsIcon className="h-6 w-6 text-muted-foreground" />
      <h1 className="text-2xl font-bold tracking-tight font-display">設定</h1>
    </div>

    <Tabs defaultValue="account">
      <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
        <TabsList className="w-max justify-start">
          <TabsTrigger value="account">アカウント</TabsTrigger>
          <TabsTrigger value="clients">クライアント管理</TabsTrigger>
          <TabsTrigger value="defaults">デフォルト値</TabsTrigger>
          <TabsTrigger value="notifications">通知設定</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="account"><SettingsAccount /></TabsContent>
      <TabsContent value="clients"><SettingsClients /></TabsContent>
      <TabsContent value="defaults"><SettingsAI /></TabsContent>
      <TabsContent value="notifications"><SettingsNotifications /></TabsContent>
    </Tabs>
  </motion.div>
);

export default Settings;
