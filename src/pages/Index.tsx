import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Welcome from './Welcome';

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === 'operator' ? '/operate' : '/supervise');
    }
  }, [isAuthenticated, user, navigate]);

  return <Welcome />;
};

export default Index;
