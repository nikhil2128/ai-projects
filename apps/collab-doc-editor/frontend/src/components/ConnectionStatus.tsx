import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface ConnectionStatusProps {
  connected: boolean;
  synced: boolean;
}

export function ConnectionStatus({ connected, synced }: ConnectionStatusProps) {
  let status: 'connected' | 'syncing' | 'disconnected';
  let label: string;
  let icon: React.ReactNode;

  if (!connected) {
    status = 'disconnected';
    label = 'Disconnected';
    icon = <WifiOff size={14} />;
  } else if (!synced) {
    status = 'syncing';
    label = 'Syncing...';
    icon = <RefreshCw size={14} className="spin" />;
  } else {
    status = 'connected';
    label = 'Connected';
    icon = <Wifi size={14} />;
  }

  return (
    <div className={`connection-status status-${status}`} title={label}>
      {icon}
      <span>{label}</span>
    </div>
  );
}
