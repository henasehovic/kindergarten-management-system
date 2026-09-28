import { Link } from 'react-router-dom'
import babyImg from '../../bebaplace.png'
import bgImg from '../../bebaplacepozadina.png'

const containerStyle = {
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px 16px',
  backgroundImage: `url(${bgImg})`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center',
  backgroundSize: 'cover',
  fontFamily: '"Poppins", "Segoe UI", sans-serif',
  color: '#183153',
  overflow: 'hidden',
}

const cardStyle = {
  maxWidth: '640px',
  width: '100%',
  padding: '24px 20px',
  textAlign: 'center',
  background: 'rgba(255, 248, 252, 0.94)',
  borderRadius: '20px',
  boxShadow: '0 18px 48px rgba(24, 49, 83, 0.12)',
  border: '1px solid rgba(255, 200, 220, 0.35)',
}

const imageWrapStyle = {
  display: 'flex',
  justifyContent: 'center',
  marginTop: '24px',
}

const imageStyle = {
  width: '460px',
  maxWidth: '85vw',
  animation: 'babyBounce 1.5s ease-in-out infinite',
}

const headingStyle = {
  fontSize: '28px',
  fontWeight: '700',
  marginBottom: '12px',
}

const textStyle = {
  fontSize: '16px',
  color: '#4a5b75',
  marginBottom: '16px',
}

const buttonStyle = {
  display: 'inline-block',
  padding: '12px 22px',
  background: '#ff7ba9',
  color: '#ffffff',
  borderRadius: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  boxShadow: '0 12px 30px rgba(255, 123, 169, 0.25)',
}

export default function NotFound() {
  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes babyBounce {
          0%, 100% { transform: translateY(0) rotate(-1deg); }
          50% { transform: translateY(-12px) rotate(1deg); }
        }
      `}</style>
      <div style={cardStyle}>
        <h1 style={headingStyle}>Oops! This page made the baby cry 😢</h1>
        <p style={textStyle}>The page you are looking for doesn&apos;t exist.</p>
        <Link to="/" style={buttonStyle}>Go back home</Link>
      </div>
      <div style={imageWrapStyle}>
        <img src={babyImg} alt="Crying baby illustration" style={imageStyle} />
      </div>
    </div>
  )
}
