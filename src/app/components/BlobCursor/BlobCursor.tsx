// @ts-nocheck
'use client';
import { useTrail, animated } from '@react-spring/web';
import { useEffect, useRef } from 'react';

import './BlobCursor.css';
import { blobPositions } from './blobPositions';

const fast = { tension: 1200, friction: 40 };
const slow = { mass: 10, tension: 200, friction: 50 };
const trans = (x, y) => `translate3d(${x}px,${y}px,0) translate3d(-50%,-50%,0)`;

const BlobCursor = ({ blobType = 'circle', fillColor = '#6B6EBF' }) => {
  const containerRef = useRef(null);
  const containerTopRef = useRef(0);

  const [trail, api] = useTrail(3, (i) => ({
    xy: [0, 0],
    config: i === 0 ? fast : slow,
    onChange: ({ value }) => {
      blobPositions[i].x = value.xy[0];
      blobPositions[i].y = value.xy[1] + containerTopRef.current;
    },
  }));

  useEffect(() => {
    const updateTop = () => {
      containerTopRef.current = containerRef.current?.getBoundingClientRect().top ?? 0;
    };
    updateTop();
    window.addEventListener('scroll', updateTop, { passive: true });
    const observer = new ResizeObserver(updateTop);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      window.removeEventListener('scroll', updateTop);
      observer.disconnect();
    };
  }, []);

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
    <div ref={containerRef} className='container'>
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
