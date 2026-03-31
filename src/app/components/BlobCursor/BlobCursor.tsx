// @ts-nocheck
'use client';
import { useTrail, animated } from '@react-spring/web';
import { useEffect } from 'react';

import './BlobCursor.css';

const fast = { tension: 1200, friction: 40 };
const slow = { mass: 10, tension: 200, friction: 50 };
const trans = (x, y) => `translate3d(${x}px,${y}px,0) translate3d(-50%,-50%,0)`;

const BlobCursor = ({ blobType = 'circle', fillColor = '#6B6EBF' }) => {
  const [trail, api] = useTrail(3, (i) => ({
    xy: [0, 0],
    config: i === 0 ? fast : slow,
  }));

  useEffect(() => {
    const handleMove = (e) => {
      const x = e.clientX ?? e.touches?.[0]?.clientX;
      const y = e.clientY ?? e.touches?.[0]?.clientY;
      api.start({ xy: [x, y] });
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
    };
  }, [api]);

  return (
    <div className='container'>
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <filter id='blob'>
          <feGaussianBlur in='SourceGraphic' result='blur' stdDeviation='30' />
          <feColorMatrix in='blur' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 35 -10' />
        </filter>
      </svg>
      <div className='main'>
        {trail.map((props, index) => (
          <animated.div
            key={index}
            style={{
              transform: props.xy.to(trans),
              borderRadius: blobType === 'circle' ? '50%' : '0%',
              backgroundColor: fillColor,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default BlobCursor;
