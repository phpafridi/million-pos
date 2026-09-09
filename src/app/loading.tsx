'use client'
import React from 'react'

export default function Loading() {
  return (
    <>
      <style>{`
        .loading-page {
          background-color: #000;
          color: white;
          width: 100vw;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          flex-direction: column;
        }

        .spinner {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
        }

        .spinner span {
          font-size: 1.5rem;
          animation: fade 1s linear 0s infinite;
        }

        .half-spinner {
          width: 60px;
          height: 60px;
          border: 4px solid #03fc4e;
          border-top: 4px solid transparent;
          border-radius: 50%;
          animation: spin 0.5s linear 0s infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes fade {
          from {
            opacity: 0.2;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>

      <div className="loading-page">
        <div className="spinner">
          <span>Loading...</span>
          <div className="half-spinner"></div>
        </div>
      </div>
    </>
  )
}
