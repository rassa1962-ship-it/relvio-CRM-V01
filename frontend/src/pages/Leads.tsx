import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { ArrowLeft, AlertTriangle, Copy, Check } from "lucide-react";

// Словарь сегментов
export const MH_SEGMENT_LABELS: Record<string, string> = {
  ai_bridge_insomnia: 'Инсомния (ИИ‑мост)',
};

type LeadStatus = 'new' | 'contacted' | 'booked' | 'paid' | 'no_response' | 'declined';

type Lead = {
  id: string;
  specialist_id: string;
  client_id: string | null;
  mh_segment_code?: string;
  contact_channel: string;
  contact_value: string;
  status: string;
  created_at: string;
  updated_at: string;
  first_contact_at?: string | null;
  decline_reason?: string | null;
  staleHours?: number;
};

type FunnelSummary = {
  new: number;
  contacted: number;
  booked: number;
  paid: number;
  no_response: number;
  declined: number;
  stale: number;
  avgResponseMinutes: number;
  revenue: number;
};

const STATUS_OPTIONS: { value: LeadStatus; label: string; color: string }[] = [
  { value: 'new', label: 'Новый', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'contacted', label: 'В диалоге', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'booked', label: 'Записан', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'paid', label: 'Оплачен', color: 'bg-emerald-500 text-white border-emerald-600' },
  { value: 'no_response', label: 'Нет ответа', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  { value: 'declined', label: 'Отказ', color: 'bg-red-100 text-red-800 border-red-200' },
];

const DECLINE_REASONS = [
  { value: '', label: 'Выберите причину...' },
  { value: 'price', label: '💰 Дорого' },
  { value: 'not_relevant', label: '❌ Не актуально' },
  { value: 'changed_mind', label: '🤔 Передумал' },
  { value: 'other', label: '📝 Другое' },
];

// Шаблоны сообщений
const MESSAGE_TEMPLATES = {
  greeting: (segment?: string) => `Здравствуйте! Вы оставляли заявку${segment ? ` по поводу ${segment.toLowerCase()}` : ''}. Подскажите, сейчас актуально?`,
  followUp: () => `Добрый день! Хотел уточнить по вашей заявке - всё ещё актуально? Можем созвониться в удобное для вас время 😊`,
  pressure: (price?: string) => `Можем предложить короткую консультацию уже сегодня${price ? ` всего за ${price}` : ''}. Удобно?`,
};

const SEGMENT_OPTIONS = [
  { value: '', label: 'Все сегменты' },
  { value: 'ai_bridge_insomnia', label: 'Инсомния (ИИ‑мост)' },
];

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [staleLeads, setStaleLeads] = useState<Lead[]>([]);
  const [summary, setSummary] = useState<FunnelSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [segmentFilter, setSegmentFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState<string>("");

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [leadsData, staleData, summaryData] = await Promise.all([
        api.leads(statusFilter || undefined),
        api.getStaleLeads().catch(() => []),
        api.getFunnelSummary().catch(() => null),
      ]);
      setLeads(leadsData);
      setStaleLeads(staleData);
      setSummary(summaryData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: string, reason?: string) => {
    setUpdatingId(leadId);
    
    // Если отказ - показываем причину
    if (newStatus === 'declined' && !reason) {
      setDeclineReason("");
      setSelectedLead(leads.find(l => l.id === leadId) || null);
      return;
    }

    // Оптимистичное обновление
    setLeads(prev => prev.map(l => 
      l.id === leadId ? { ...l, status: newStatus } : l
    ));
    
    try {
      await api.updateLead(leadId, { 
        status: newStatus,
        decline_reason: reason || undefined
      });
      setSelectedLead(null);
      setDeclineReason("");
    } catch (err) {
      console.error(err);
      const data = await api.leads(statusFilter || undefined);
      setLeads(data);
      alert('Ошибка при обновлении статуса');
    } finally {
      setUpdatingId(null);
    }
  };

  const copyTemplate = async (templateKey: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTemplate(templateKey);
      setTimeout(() => setCopiedTemplate(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getResponseTime = (lead: Lead): { text: string; color: string; bgColor: string } | null => {
    if (!lead.first_contact_at || !lead.created_at) return null;
    
    const createdMs = new Date(lead.created_at).getTime();
    const contactedMs = new Date(lead.first_contact_at).getTime();
    const diffMs = contactedMs - createdMs;
    const diffMinutes = Math.round(diffMs / 60000);
    
    let text = diffMinutes < 60 
      ? `${diffMinutes} мин` 
      : `${Math.round(diffMinutes / 60 * 10) / 10} ч`;
    
    let color: string;
    let bgColor: string;
    
    if (diffMinutes < 5) {
      color = 'text-green-700';
      bgColor = 'bg-green-100';
    } else if (diffMinutes < 30) {
      color = 'text-yellow-700';
      bgColor = 'bg-yellow-100';
    } else {
      color = 'text-red-700';
      bgColor = 'bg-red-100';
    }
    
    return { text, color, bgColor };
  };

  const getStatusLabel = (status: string) => {
    const found = STATUS_OPTIONS.find(s => s.value === status);
    return found?.label || status;
  };

  const getChannelLabel = (channel: string) => {
    const labels: Record<string, string> = {
      telegram: "📱 Telegram",
      vk: "💬 VK",
      email: "📧 Email",
      phone: "📞 Телефон",
      in_app: "💻 В приложении",
      other: "❓ Другое"
    };
    return labels[channel] || channel;
  };

  const getStaleColor = (hours: number) => {
    if (hours < 2) return 'text-yellow-600 bg-yellow-50';
    if (hours < 4) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const filteredLeads = leads.filter(l => 
    !segmentFilter || l.mh_segment_code === segmentFilter
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Mini Dashboard */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
            <div className="text-2xl font-bold text-blue-700">{summary.new}</div>
            <div className="text-xs text-blue-600">Новые</div>
          </div>
          <div className="bg-green-50 rounded-xl p-3 border border-green-100">
            <div className="text-2xl font-bold text-green-700">{summary.contacted}</div>
            <div className="text-xs text-green-600">В диалоге</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
            <div className="text-2xl font-bold text-purple-700">{summary.booked}</div>
            <div className="text-xs text-purple-600">Записаны</div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
            <div className="text-2xl font-bold text-emerald-700">{summary.paid}</div>
            <div className="text-xs text-emerald-600">Оплачены</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <div className="text-2xl font-bold text-gray-700">${summary.revenue}</div>
            <div className="text-xs text-gray-600">Выручка</div>
          </div>
          <div className="bg-red-50 rounded-xl p-3 border border-red-100">
            <div className="text-2xl font-bold text-red-700">{summary.stale}</div>
            <div className="text-xs text-red-600">⚠️ Забытые</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
            <div className="text-2xl font-bold text-amber-700">
              {summary.avgResponseMinutes > 0 ? `${summary.avgResponseMinutes}м` : '—'}
            </div>
            <div className="text-xs text-amber-600">⏱ Средний ответ</div>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
            <div className="text-2xl font-bold text-orange-700">{summary.declined}</div>
            <div className="text-xs text-orange-600">Отказы</div>
          </div>
        </div>
      )}

      {/* Stale Leads Warning */}
      {staleLeads.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span className="font-semibold text-amber-800">
              ⚠️ Забытые лиды: {staleLeads.length}
            </span>
            <span className="text-amber-600 text-sm">
              (без действия более 2 часов)
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {staleLeads.slice(0, 5).map(lead => (
              <button
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className={`px-3 py-1.5 rounded-lg text-sm border ${getStaleColor(lead.staleHours || 0)}`}
              >
                {lead.contact_value.slice(0, 15)}... ({lead.staleHours}ч)
              </button>
            ))}
            {staleLeads.length > 5 && (
              <span className="text-amber-600 text-sm self-center">
                +{staleLeads.length - 5} ещё...
              </span>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Назад
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Лиды</h1>
        </div>
        <div className="flex gap-2">
          <select
            value={segmentFilter}
            onChange={(e) => setSegmentFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 bg-white"
          >
            {SEGMENT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 bg-white"
          >
            <option value="">Все статусы</option>
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-500">Загрузка...</div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Нет лидов для отображения.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Дата</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">⏱ Ответ</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Канал</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Контакт</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Сегмент</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Статус</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => {
                  const responseTime = getResponseTime(lead);
                  const isStale = lead.staleHours && lead.staleHours > 2;
                  
                  return (
                    <tr 
                      key={lead.id} 
                      className={`border-b hover:bg-gray-50 ${isStale ? 'bg-red-50' : ''}`}
                    >
                      <td className="py-3 px-4 text-gray-500 text-sm">
                        {new Date(lead.created_at).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3 px-4">
                        {responseTime ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${responseTime.bgColor} ${responseTime.color}`}>
                            {responseTime.text}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {getChannelLabel(lead.contact_channel)}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {lead.contact_value}
                      </td>
                      <td className="py-3 px-4">
                        {lead.mh_segment_code ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {MH_SEGMENT_LABELS[lead.mh_segment_code] || lead.mh_segment_code}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                          disabled={updatingId === lead.id}
                          className={`px-2 py-1 rounded-full text-xs font-medium border cursor-pointer ${STATUS_OPTIONS.find(s => s.value === lead.status)?.color || 'bg-gray-100 text-gray-800'}`}
                        >
                          {STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        {lead.decline_reason && (
                          <div className="text-xs text-red-500 mt-1">
                            {DECLINE_REASONS.find(r => r.value === lead.decline_reason)?.label.split(' ')[0]} {lead.decline_reason}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setSelectedLead(lead)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Подробнее
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lead Details Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Детали лида</h2>
              <button
                onClick={() => { setSelectedLead(null); setDeclineReason(""); }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Канал связи</div>
                  <div className="font-medium">{getChannelLabel(selectedLead.contact_channel)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Контакт</div>
                  <div className="font-medium">{selectedLead.contact_value}</div>
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Сегмент MH</div>
                <div className="font-medium">
                  {selectedLead.mh_segment_code 
                    ? MH_SEGMENT_LABELS[selectedLead.mh_segment_code] || selectedLead.mh_segment_code
                    : '—'}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Текущий статус</div>
                <div className="font-medium">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_OPTIONS.find(s => s.value === selectedLead.status)?.color}`}>
                    {getStatusLabel(selectedLead.status)}
                  </span>
                </div>
              </div>

              {getResponseTime(selectedLead) && (
                <div>
                  <div className="text-sm text-gray-500">Время до первого контакта</div>
                  <div className={`font-medium text-lg ${getResponseTime(selectedLead)?.color}`}>
                    ⏱ {getResponseTime(selectedLead)?.text}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Создан</div>
                  <div className="font-medium text-sm">
                    {new Date(selectedLead.created_at).toLocaleString('ru-RU')}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Обновлён</div>
                  <div className="font-medium text-sm">
                    {new Date(selectedLead.updated_at).toLocaleString('ru-RU')}
                  </div>
                </div>
              </div>

              {/* Quick Message Templates */}
              <div className="border-t pt-4 mt-4">
                <div className="text-sm font-medium text-gray-700 mb-3">💬 Быстрые действия</div>
                <div className="space-y-2">
                  <button
                    onClick={() => copyTemplate('greeting', MESSAGE_TEMPLATES.greeting(selectedLead.mh_segment_code))}
                    className="w-full text-left px-3 py-2 bg-green-50 hover:bg-green-100 rounded-lg text-sm flex items-center justify-between"
                  >
                    <span>👋 Приветственное сообщение</span>
                    {copiedTemplate === 'greeting' ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => copyTemplate('followUp', MESSAGE_TEMPLATES.followUp())}
                    className="w-full text-left px-3 py-2 bg-yellow-50 hover:bg-yellow-100 rounded-lg text-sm flex items-center justify-between"
                  >
                    <span>📞 Дожим (follow-up)</span>
                    {copiedTemplate === 'followUp' ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => copyTemplate('pressure', MESSAGE_TEMPLATES.pressure())}
                    className="w-full text-left px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm flex items-center justify-between"
                  >
                    <span>🔥 Предложение записи</span>
                    {copiedTemplate === 'pressure' ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Decline Reason Select */}
              {selectedLead.status !== 'declined' && (
                <div className="border-t pt-4 mt-4">
                  <div className="text-sm font-medium text-gray-700 mb-3">❌ Отказ</div>
                  <select
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 mb-2"
                  >
                    {DECLINE_REASONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {declineReason && (
                    <button
                      onClick={() => handleStatusChange(selectedLead.id, 'declined', declineReason)}
                      disabled={updatingId === selectedLead.id}
                      className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg disabled:opacity-50"
                    >
                      Подтвердить отказ
                    </button>
                  )}
                </div>
              )}

              {selectedLead.decline_reason && (
                <div className="bg-red-50 rounded-lg p-3">
                  <div className="text-sm text-gray-500">Причина отказа</div>
                  <div className="font-medium text-red-700">
                    {DECLINE_REASONS.find(r => r.value === selectedLead.decline_reason)?.label}
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-400 mt-4">
                ID: {selectedLead.id}
              </div>
            </div>

            <button
              onClick={() => { setSelectedLead(null); setDeclineReason(""); }}
              className="mt-6 w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
