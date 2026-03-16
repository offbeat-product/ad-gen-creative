import { Settings as SettingsIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SettingsAI from './settings/SettingsAI';
import SettingsClients from './settings/SettingsClients';
import SettingsTeam from './settings/SettingsTeam';
import SettingsNotifications from './settings/SettingsNotifications';
import SettingsAccount from './settings/SettingsAccount';

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

    <Tabs defaultValue="ai">
      <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
        <TabsList className="w-max justify-start">
          <TabsTrigger value="ai">AI生成設定</TabsTrigger>
          <TabsTrigger value="clients">クライアント管理</TabsTrigger>
          <TabsTrigger value="team">チーム管理</TabsTrigger>
          <TabsTrigger value="notifications">通知設定</TabsTrigger>
          <TabsTrigger value="account">アカウント</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="ai"><SettingsAI /></TabsContent>
      <TabsContent value="clients"><SettingsClients /></TabsContent>
      <TabsContent value="team"><SettingsTeam /></TabsContent>
      <TabsContent value="notifications"><SettingsNotifications /></TabsContent>
      <TabsContent value="account"><SettingsAccount /></TabsContent>
    </Tabs>
  </motion.div>
);

export default Settings;
