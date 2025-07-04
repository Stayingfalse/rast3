// src/app/_components/preloader.tsx

export function Preloader({
  message = "Santa is sorting your parcels...",
}: {
  message?: string;
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 200 200"
        width="120"
        height="120"
        className="mb-4"
      >
        <circle
          fill="#FF156D"
          stroke="#FF156D"
          strokeWidth="15"
          r="15"
          cx="35"
          cy="100"
        >
          <animate
            attributeName="cx"
            calcMode="spline"
            dur="2"
            values="35;165;165;35;35"
            keySplines="0 .1 .5 1;0 .1 .5 1;0 .1 .5 1;0 .1 .5 1"
            repeatCount="indefinite"
            begin="0"
          ></animate>
        </circle>
        <circle
          fill="#FF156D"
          stroke="#FF156D"
          strokeWidth="15"
          opacity=".8"
          r="15"
          cx="35"
          cy="100"
        >
          <animate
            attributeName="cx"
            calcMode="spline"
            dur="2"
            values="35;165;165;35;35"
            keySplines="0 .1 .5 1;0 .1 .5 1;0 .1 .5 1;0 .1 .5 1"
            repeatCount="indefinite"
            begin="0.05"
          ></animate>
        </circle>
        <circle
          fill="#FF156D"
          stroke="#FF156D"
          strokeWidth="15"
          opacity=".6"
          r="15"
          cx="35"
          cy="100"
        >
          <animate
            attributeName="cx"
            calcMode="spline"
            dur="2"
            values="35;165;165;35;35"
            keySplines="0 .1 .5 1;0 .1 .5 1;0 .1 .5 1;0 .1 .5 1"
            repeatCount="indefinite"
            begin=".1"
          ></animate>
        </circle>
        <circle
          fill="#FF156D"
          stroke="#FF156D"
          strokeWidth="15"
          opacity=".4"
          r="15"
          cx="35"
          cy="100"
        >
          <animate
            attributeName="cx"
            calcMode="spline"
            dur="2"
            values="35;165;165;35;35"
            keySplines="0 .1 .5 1;0 .1 .5 1;0 .1 .5 1;0 .1 .5 1"
            repeatCount="indefinite"
            begin=".15"
          ></animate>
        </circle>
        <circle
          fill="#FF156D"
          stroke="#FF156D"
          strokeWidth="15"
          opacity=".2"
          r="15"
          cx="35"
          cy="100"
        >
          <animate
            attributeName="cx"
            calcMode="spline"
            dur="2"
            values="35;165;165;35;35"
            keySplines="0 .1 .5 1;0 .1 .5 1;0 .1 .5 1;0 .1 .5 1"
            repeatCount="indefinite"
            begin=".2"
          ></animate>
        </circle>
      </svg>
      <div className="text-lg font-medium text-gray-700">{message}</div>
    </div>
  );
}
