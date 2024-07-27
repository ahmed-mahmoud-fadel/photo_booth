import { Canvas, ObjectMap } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { BufferGeometry, Euler, Vector3 } from "three";
import { GLTF } from "three/examples/jsm/Addons.js";
import ModelRenderer from "./ModelRenderer";
import { Environment } from "@react-three/drei";
import frame from '../global/img/frame.png';
import icon from '../global/img/icon.png';
import { faCamera } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';

const ARScene = ({
  setups,
  extras,
  loopFunc,
  facingMode = "user",
  // videoUrl
}: {
  setups: {
    baseModelGeometry: BufferGeometry,
    transformations?: {
      position: number[],
      rotation: number[],
      scale: number[],
    } | null,
    renderedModel: GLTF & ObjectMap,
  }[],
  extras?: React.ReactNode,
  loopFunc: (video: HTMLVideoElement) => void,
  facingMode?: "user" | "environment",
  // videoUrl?: string
}) => {
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null); // State to store QR code URL
  const [showQrCode, setShowQrCode] = useState<boolean>(false); // State to control QR code visibility
  const [countdown, setCountdown] = useState<number | null>(null); // State for countdown
  const glCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const loop = useCallback(() => {
    if (video) loopFunc(video);
  }, [video, loopFunc]);
  const loopRef = useRef(loop);

  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  const animate = useCallback(() => {
    loopRef.current();
    requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    requestAnimationFrame(animate);
  }, [animate]);

  const startCountdown = async () => {
    for (let i = 5; i > 0; i--) {
      setCountdown(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    setCountdown(null);
    console.log("Countdown complete, capturing screenshot...");
    captureScreenshot();
  };

  const captureScreenshot = async () => {
    const element = document.querySelector('.demo-container') as HTMLElement;
    if (!element) return;

    try {
      // Capture screenshot
      const canvas = await html2canvas(element, {
        backgroundColor: null,
        allowTaint: true, // Allow cross-origin images
        useCORS: true,   // Fetch cross-origin images using CORS
        ignoreElements: (el) => el.classList.contains('capture-ignore') // Exclude elements with this class
      });

      // Convert canvas to a PNG Blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png');
      });

      if (!blob) {
        throw new Error('Failed to create a blob from the canvas.');
      }

      // Prepare FormData
      const formData = new FormData();
      formData.append('file', blob, 'screenshot.png');

      // Upload the file
      const response = await fetch(`http://localhost:3000/api/v1/photo-booth`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const imageUrl = data.photo; // Extract image URL from 'photo' attribute
        console.log('Image URL from API:', imageUrl);

        if (!imageUrl || typeof imageUrl !== 'string') {
          throw new Error('Invalid or empty image URL.');
        }

        // Generate QR code
        QRCode.toDataURL(imageUrl, (err, url) => {
          if (err) {
            console.error('Error generating QR code:', err);
            return;
          }

          // Update state to show QR code
          setQrCodeUrl(url);
          setShowQrCode(true);

          // Hide QR code after 5 seconds
          setTimeout(() => {
            setShowQrCode(false);
          }, 7000);
        });

      } else {
        console.error('Error uploading screenshot:', response.statusText);
      }
    } catch (error) {
      console.error("Error capturing or uploading screenshot:", error);
    }
  };

  return (
    <div
      className="demo-container"
      style={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        height: "100%",
        transform: "scaleX(-1)",
      }}
    >
      <img
        src={icon}
        alt="Icon"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "50px",
          height: "50px",
          zIndex: 20,
          margin: "25px",
        }}
      />
      <img
        src={frame}
        alt="Frame"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 10,
          transform: "scaleX(-1)",
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          height: "max-content",
          position: "relative",
        }}
      >
        <Webcam
          onPlay={(e) => {
            setVideo(e.currentTarget);
          }}
          videoConstraints={{ facingMode }}
          style={{
            width: "100%",
          }}
        />
        {video && (
          <div
            style={{
              position: "absolute",
              top: 0,
              width: video.clientWidth,
              height: video.clientHeight,
              display: "flex",
              alignItems: "center",
              justifyItems: "center",
            }}
          >
              <Canvas
                gl={{ preserveDrawingBuffer: true }}
                orthographic
                camera={{
                  left: 0,
                  right: 1,
                  top: 0,
                  bottom: 1,
                  position: [0, 0, 5],
                  near: -300,
                  far: 300,
                }}
                onCreated={({ camera, gl }) => {
                  camera.lookAt(0, 0, -1);
                  camera.updateProjectionMatrix();
                  glCanvasRef.current = gl.domElement;
                }}
              >
                <Suspense>
                  <Environment
                    background={false}
                    files="warehouse.hdr"
                    path={import.meta.env.BASE_URL}
                    environmentRotation={new Euler(0, Math.PI / 2, 0)}
                    environmentIntensity={0.2}
                  />
                </Suspense>
                <ambientLight intensity={2} />
                <group scale={new Vector3(1, 1, -1)}>
                  {setups.map((setup, n) => (
                    <ModelRenderer
                      key={n}
                      baseModelGeometry={setup.baseModelGeometry}
                      renderedModel={setup.renderedModel}
                      transformations={setup.transformations}
                      aspect={video.videoWidth / video.videoHeight}
                    />
                  ))}
                </group>
                {extras}
              </Canvas>
          </div>
        )}
      </div>

      <button
        className="capture-ignore"
        onClick={startCountdown}
        style={{
          position: "absolute",
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          border: "3px solid #D05CF9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999,
          cursor: "pointer",
        }}
      >
        <FontAwesomeIcon icon={faCamera} color="#D05CF9" size="2x" />
      </button>

      {countdown && (
        <div
          className="capture-ignore"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%) scaleX(-1)",
            fontFamily: "Arial",
            fontSize: "5rem",
            color: "#D05CF9",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            width: "150px",
            height: "150px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            zIndex: 1000,
          }}
        >
          {countdown}
        </div>
      )}

      {showQrCode && qrCodeUrl && (
        <div
          className="capture-ignore"
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            backgroundColor: "#FFF",
            padding: "10px",
            borderRadius: "5px",
            zIndex: 999,
          }}
        >
          <img src={qrCodeUrl} alt="QR Code" style={{ width: "100px", height: "100px" }} />
        </div>
      )}
    </div>
  );
};

export default ARScene;
