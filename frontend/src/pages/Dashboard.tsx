import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api, FunnelSummary, Lead } from "../api/client";
import { Clock, UserPlus, Plus, List, User, Shield, Moon, Sun, RefreshCw } from "lucide-react";
import { supabase } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { useUser } from "../hooks/useUser";

export default function Dashboard() {
  const { theme, toggleTheme } = useTheme()
  const { user } = useUser()
  const isAdmin = user?.role === 'admin'
  
  const [summary, setSummary] = useState<FunnelSummary>({
    new: 0,
    contacted: 0,
    booked: 0,
    paid: 0,
    no_response: 0,
    declined: 0,
    stale: 0,
    avgResponseMinutes: 0,
    revenue: 0,
  });
  const [sessions, setSessions] = useState<{ id: string; start_time: string; format: string; status: string; clients?: { display_name: string } }[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLead, setNewLead] = useState({
    contact_channel: 'telegram' as string,
    contact_value: '' as string,
    mh_segment_code: '' as string
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
    // Polling каждые 30 секунд
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);
  
  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryData, sessionsData, leadsData] = await Promise.all([
        api.funnel(),
        api.sessions({
          from: new Date(Date.now() - 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          to: new Date().toISOString().split("T")[0]
        }),
        api.leads()
      ]);
      setSummary(summaryData);
      setSessions(sessionsData);
      setLeads(leadsData);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        alert('Сессия истекла. Войдите заново.');
        return;
      }
      
      await api.createLead({
        specialist_id: session.user.id,
        contact_channel: newLead.contact_channel,
        contact_value: newLead.contact_value,
        mh_segment_code: newLead.mh_segment_code || undefined
      });
      
      setShowAddForm(false);
      setNewLead({ contact_channel: 'telegram', contact_value: '', mh_segment_code: '' });
      loadData();
    } catch (err) {
      console.error(err);
      alert('Ошибка при создании лида');
    } finally {
      setSaving(false);
    }
  };
  
  const getChannelLabel = (channel: string) => {
    const labels: Record<string, string> = {
      telegram: "Telegram",
      email: "Email",
      in_app: "В приложении",
      other: "Другое"
    };
    return labels[channel] || channel;
  };
  
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      new: "Новый",
      contacted: "В диалоге",
      booked: "Записан",
      paid: "Оплачен",
      no_response: "Нет ответа",
      declined: "Отказ"
    };
    return labels[status] || status;
  };

  // Шаблоны сообщений для быстрых действий
  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert(message);
    }).catch(() => {
      alert('Не удалось скопировать');
    });
  };

  const getQuickActions = (lead: Lead) => {
    const name = lead.meta?.name || 'Клиент';
    return [
      {
        label: '👋 Приветствие',
        text: `Привет, ${name}! Ты оставлял заявку по поводу сна 🙌\nСкажи, сейчас это ещё актуально?`,
        color: 'bg-blue-500 hover:bg-blue-600 text-white'
      },
      {
        label: '🔍 Диагностика',
        text: `Понял. Скажи, что сейчас больше всего мешает уснуть?\nДолго засыпаешь или просыпаешься ночью?`,
        color: 'bg-yellow-500 hover:bg-yellow-600 text-white'
      },
      {
        label: '💰 Предложение',
        text: "Похоже на типичную реакцию нервной системы на стресс.\n\nМы обычно такие вещи быстро разбираем на консультации — становится заметно легче уже после первой встречи.\n\nХочешь, подберём тебе время сегодня/завтра?",
        color: 'bg-emerald-500 hover:bg-emerald-600 text-white'
      },
      {
        label: '🔥 Дожим 30мин',
        text: `Напомню про сообщение выше 🙂\n\nОбычно такие состояния лучше не затягивать — их можно довольно быстро стабилизировать.\n\nУдобно сегодня или завтра?`,
        color: 'bg-orange-500 hover:bg-orange-600 text-white'
      },
      {
        label: '⏰ Дожим 3-6ч',
        text: `Привет! Похоже, ты оставлял заявку и пропал 🙂\n\nЕсли тема сна ещё актуальна — напиши, подскажем, как можно быстро улучшить состояние.`,
        color: 'bg-red-500 hover:bg-red-600 text-white'
      }
    ];
  };

  // Urgency tracking - проверка "горящих" лидов
  const getUrgency = (lead: Lead) => {
    // Если уже в диалоге, записан или оплачен - не срочно
    if (['contacted', 'booked', 'paid'].includes(lead.status)) {
      return null;
    }
    
    const now = new Date().getTime();
    const created = new Date(lead.created_at).getTime();
    const hoursSinceCreation = (now - created) / (1000 * 60 * 60);
    
    // Если first_contact_at есть - проверяем время с него
    const lastActionTime = lead.first_contact_at ? new Date(lead.first_contact_at).getTime() : created;
    const hoursSinceAction = (now - lastActionTime) / (1000 * 60 * 60);
    
    const hours = lead.first_contact_at ? hoursSinceAction : hoursSinceCreation;
    
    // Яркие контрастные цвета для читабельности
    if (hours >= 24) return { level: 'critical', text: '⚠️ 24ч+', bgColor: 'bg-red-500', textColor: 'text-white' };
    if (hours >= 6) return { level: 'high', text: '⏰ 6ч+', bgColor: 'bg-orange-500', textColor: 'text-white' };
    if (hours >= 2) return { level: 'medium', text: '⏱ 2ч+', bgColor: 'bg-yellow-500', textColor: 'text-black' };
    
    return null;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Дашборд</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
            title={loading ? 'Обновление...' : 'Обновить данные'}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          {isAdmin && (
            <Link
              to="/admin/leads"
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
              <Shield className="w-5 h-5" />
              Админ
            </Link>
          )}
          <Link
            to="/profile"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <User className="w-5 h-5" />
            Профиль
          </Link>
        </div>
      </div>

      {/* KPI + График - 2 колонки */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        {/* Левая часть - KPI карточки */}
        <div className="lg:col-span-3 space-y-3">
          {/* Верхний ряд - маленькие (воронка) */}
          <div className="grid grid-cols-3 gap-3">
            {/* Новые */}
            <div className="relative bg-gradient-to-br from-blue-500 to-blue-700 p-3 rounded-2xl shadow-lg border border-blue-600 overflow-hidden">
              <div className="absolute top-0 right-0 w-12 h-12 bg-blue-300/40 rounded-full blur-2xl -translate-y-2 translate-x-2"></div>
              <div className="text-2xl font-bold text-white mb-0.5 drop-shadow">{summary.new}</div>
              <div className="text-xs font-bold text-blue-100">Новые</div>
            </div>
            
            {/* В диалоге */}
            <div className="relative bg-gradient-to-br from-green-500 to-green-700 p-3 rounded-2xl shadow-lg border border-green-600 overflow-hidden">
              <div className="absolute top-0 right-0 w-12 h-12 bg-green-300/40 rounded-full blur-2xl -translate-y-2 translate-x-2"></div>
              <div className="text-2xl font-bold text-white mb-0.5 drop-shadow">{summary.contacted}</div>
              <div className="text-xs font-bold text-green-100">В диалоге</div>
            </div>
            
            {/* Записаны */}
            <div className="relative bg-gradient-to-br from-violet-500 to-violet-700 p-3 rounded-2xl shadow-lg border border-violet-600 overflow-hidden">
              <div className="absolute top-0 right-0 w-12 h-12 bg-violet-300/40 rounded-full blur-2xl -translate-y-2 translate-x-2"></div>
              <div className="text-2xl font-bold text-white mb-0.5 drop-shadow">{summary.booked}</div>
              <div className="text-xs font-bold text-violet-100">Записаны</div>
            </div>
          </div>
          
          {/* Нижний ряд - большие (деньги) */}
          <div className="grid grid-cols-3 gap-3">
            {/* Оплачены */}
            <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 rounded-2xl shadow-lg border-2 border-emerald-400 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-300/50 rounded-full blur-3xl -translate-y-4 translate-x-4"></div>
              <div className="text-5xl font-bold text-white mb-1 drop-shadow-lg">{summary.paid}</div>
              <div className="text-base font-bold text-emerald-100">Оплачено</div>
            </div>
            
            {/* Выручка */}
            <div className="relative bg-gradient-to-br from-amber-500 to-amber-700 p-5 rounded-2xl shadow-lg border-2 border-amber-400 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-300/50 rounded-full blur-3xl -translate-y-4 translate-x-4"></div>
              <div className="text-5xl font-bold text-white mb-1 drop-shadow-lg">${summary.revenue}</div>
              <div className="text-base font-bold text-amber-100">Выручка</div>
            </div>
            
            {/* Забытые */}
            <div className="relative bg-gradient-to-br from-red-500 to-red-700 p-5 rounded-2xl shadow-lg border-2 border-red-400 overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-red-300/50 rounded-full blur-3xl -translate-y-4 translate-x-4 animate-pulse"></div>
              <div className="text-5xl font-bold text-white mb-1 drop-shadow-lg">{summary.stale}</div>
              <div className="text-base font-bold text-red-100">⚠️ Забытые</div>
            </div>
          </div>
        </div>
        
        {/* Правая часть - Визуальный график воронки */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 flex flex-col items-center justify-center">
          <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4">Воронка</h3>
          <div className="w-full flex flex-col items-center gap-2">
            {[
              { label: 'Новые', value: summary.new, color: 'bg-blue-500', width: '100%' },
              { label: 'В диалоге', value: summary.contacted, color: 'bg-green-500', width: summary.new > 0 ? `${(summary.contacted / summary.new) * 100}%` : '0%' },
              { label: 'Записаны', value: summary.booked, color: 'bg-violet-500', width: summary.contacted > 0 ? `${(summary.booked / summary.contacted) * 100}%` : '0%' },
              { label: 'Оплачено', value: summary.paid, color: 'bg-emerald-500', width: summary.booked > 0 ? `${(summary.paid / summary.booked) * 100}%` : '0%' },
            ].map((item, i) => (
              <div key={i} className="w-full flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 w-16 text-right">{item.label}</span>
                <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${item.color} rounded-full transition-all duration-500`}
                    style={{ width: item.width }}
                  ></div>
                </div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 w-6">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent sessions */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
          <Clock className="w-5 h-5" />
          Ближайшие сессии
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  Клиент
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  Время
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  Формат
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  Статус
                </th>
              </tr>
            </thead>
            <tbody>
              {sessions.slice(0, 5).map((s, i) => (
                <tr key={i} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="py-3 px-4 text-gray-900 dark:text-gray-100">
                    {s.clients?.display_name || "N/A"}
                  </td>
                  <td className="py-3 px-4 text-gray-900 dark:text-gray-100">
                    {s.start_time
                      ? new Date(s.start_time).toLocaleString()
                      : "—"}
                  </td>
                  <td className="py-3 px-4 text-gray-900 dark:text-gray-100">
                    {s.format === "online" ? "Онлайн" : "Офлайн"}
                  </td>
                  <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{s.status}</td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-4 px-4 text-gray-500 text-center"
                  >
                    Пока нет запланированных сессий.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent leads */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
            <UserPlus className="w-5 h-5" />
            Последние лиды
          </h2>
          <div className="flex gap-2">
            <Link
              to="/leads"
              className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <List className="w-4 h-4" />
              Все лиды
            </Link>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Добавить лида
            </button>
          </div>
        </div>

        {/* Add Lead Form */}
        {showAddForm && (
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-4">
            <form onSubmit={handleAddLead} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Канал
                  </label>
                  <select
                    value={newLead.contact_channel}
                    onChange={(e) => setNewLead({...newLead, contact_channel: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                  >
                    <option value="telegram">Telegram</option>
                    <option value="email">Email</option>
                    <option value="in_app">В приложении</option>
                    <option value="other">Другое</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Контакт
                  </label>
                  <input
                    type="text"
                    value={newLead.contact_value}
                    onChange={(e) => setNewLead({...newLead, contact_value: e.target.value})}
                    placeholder="@username или email"
                    required
                    className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Сегмент (код)
                  </label>
                  <input
                    type="text"
                    value={newLead.mh_segment_code}
                    onChange={(e) => setNewLead({...newLead, mh_segment_code: e.target.value})}
                    placeholder="sos_anxiety_30d"
                    className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? 'Создаём...' : 'Создать'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
              <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  Канал
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  Контакт
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  Сегмент
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  Статус
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  Срочность
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  ⏱ Ответ
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  Дата
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody>
              {leads.slice(0, 10).map((lead) => {
                // Расчёт времени ответа
                const getResponseTime = () => {
                  if (!lead.first_contact_at) return null;
                  const created = new Date(lead.created_at).getTime();
                  const contacted = new Date(lead.first_contact_at).getTime();
                  const diffMinutes = Math.round((contacted - created) / 60000);
                  
                  if (diffMinutes < 1) return { text: '<1 мин', color: 'text-green-600' };
                  if (diffMinutes < 5) return { text: `${diffMinutes} мин`, color: 'text-green-600' };
                  if (diffMinutes < 30) return { text: `${diffMinutes} мин`, color: 'text-yellow-600' };
                  if (diffMinutes < 60) return { text: `${diffMinutes} мин`, color: 'text-orange-600' };
                  return { text: `${diffMinutes} мин`, color: 'text-red-600' };
                };
                const responseTime = getResponseTime();
                
                const urgency = getUrgency(lead);
                
                return (
                <tr key={lead.id} className={`border-b hover:bg-gray-50 dark:hover:bg-gray-700 ${urgency ? 'border-l-4 ' + (urgency.level === 'critical' ? 'border-red-500' : urgency.level === 'high' ? 'border-orange-500' : 'border-yellow-500') : ''}`}>
                  <td className="py-3 px-4 text-gray-900 dark:text-gray-100">
                    {getChannelLabel(lead.contact_channel)}
                  </td>
                  <td className="py-3 px-4 text-gray-900 dark:text-gray-100">
                    {lead.contact_value}
                  </td>
                  <td className="py-3 px-4 text-gray-500">
                    {lead.mh_segment_code || "—"}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium
                      ${lead.status === 'new' ? 'bg-blue-100 text-blue-800' : ''}
                      ${lead.status === 'contacted' ? 'bg-green-100 text-green-800' : ''}
                      ${lead.status === 'booked' ? 'bg-purple-100 text-purple-800' : ''}
                      ${lead.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : ''}
                      ${lead.status === 'no_response' ? 'bg-gray-100 text-gray-800' : ''}
                      ${lead.status === 'declined' ? 'bg-red-100 text-red-800' : ''}
                    `}>
                      {getStatusLabel(lead.status)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {urgency ? (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${urgency.bgColor} ${urgency.textColor}`}>
                        {urgency.text}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {responseTime ? (
                      <span className={`font-medium ${responseTime.color}`}>
                        {responseTime.text}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-500">
                    {new Date(lead.created_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1 flex-wrap">
                      {getQuickActions(lead).map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => copyToClipboard(action.text, `Скопировано: ${action.label}`)}
                          className={`px-2 py-1 rounded-lg text-xs font-medium ${action.color}`}
                          title={action.label}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              )})}
              {leads.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-4 px-4 text-gray-500 text-center"
                  >
                    Пока нет лидов.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
