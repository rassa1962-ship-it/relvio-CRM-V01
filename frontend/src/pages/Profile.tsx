import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ArrowLeft, LogOut, User } from "lucide-react";

type Specialist = {
  id: string;
  email: string;
  full_name: string;
  timezone: string;
};

export default function Profile() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const [specialist, setSpecialist] = useState<Specialist | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Загружаем данные специалиста
    const loadProfile = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/me', {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setSpecialist(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (session?.access_token) {
      loadProfile();
    }
  }, [session]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          Назад
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Профиль</h1>
            <p className="text-gray-500">Настройки аккаунта</p>
          </div>
        </div>

        {specialist ? (
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-500">Имя</div>
              <div className="font-medium">{specialist.full_name}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Email</div>
              <div className="font-medium">{specialist.email}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Часовой пояс</div>
              <div className="font-medium">{specialist.timezone}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">ID</div>
              <div className="font-medium text-xs text-gray-400">{specialist.id}</div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 mb-4">
            Данные профиля не загружены
          </div>
        )}

        <button
          onClick={handleSignOut}
          className="mt-6 w-full flex items-center justify-center gap-2 bg-red-100 text-red-700 py-3 rounded-lg hover:bg-red-200"
        >
          <LogOut className="w-5 h-5" />
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
}
