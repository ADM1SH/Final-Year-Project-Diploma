// Drop-in replacement for React Native's Image that automatically adds
// the ngrok-skip-browser-warning header so images load through the ngrok tunnel.
// Without this header, ngrok returns an HTML interstitial page instead of the image.
import React from 'react';
import { Image } from 'react-native';

// Defined outside the component so the object reference is stable and does not
// trigger re-renders or create a new object on every render call.
const NGROK_HEADERS = {
    'ngrok-skip-browser-warning': 'true',
    'User-Agent': 'MyPreLove-App',
};

const AppImage = ({ source, ...props }) => {
    // Only add headers to URI-based sources (not require() or local assets).
    if (source && source.uri) {
        return (
            <Image
                {...props}
                source={{
                    ...source,
                    headers: { ...NGROK_HEADERS, ...(source.headers || {}) },
                }}
            />
        );
    }
    return <Image source={source} {...props} />;
};

// Wrapped in memo: source and props almost never change between parent renders,
// so this avoids unnecessary image re-renders inside lists.
export default React.memo(AppImage);
