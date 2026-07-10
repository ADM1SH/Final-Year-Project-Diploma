import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { COLORS } from '../utils/constants';

// Stable colour palette so the array reference never changes between renders.
const PIE_COLORS = [
    COLORS.primary,
    '#4ade80',
    '#0ea5e9',
    '#f59e0b',
    '#ec4899',
    '#8b5cf6',
    '#64748b',
];

// Chart config defined outside the component; the object is passed directly to
// PieChart and creating a new one on every render forces a chart re-render.
const CHART_CONFIG = {
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
};

// Stable chart dimensions — reading Dimensions inside the component body on
// every render is wasteful for a value that only changes on device rotation.
const CHART_WIDTH = Dimensions.get('window').width - 60;
const CHART_HEIGHT = 180;

const EmptyAnalytics = () => (
    <View style={styles.container}>
        <Text style={styles.title}>Eco Impact Stats</Text>
        <Text style={styles.emptyText}>
            Complete a transaction to see your environmental impact stats here.
        </Text>
    </View>
);

const ProfileAnalytics = ({ transactions }) => {
    // Derive chart data from transactions; memoised so it only recomputes when
    // the transactions array identity changes.
    const chartData = useMemo(() => {
        if (!transactions || transactions.length === 0) return [];

        const categoryCounts = {};
        transactions.forEach(t => {
            if (t.status === 'COMPLETED') {
                const cat = t.item_category || 'Other';
                categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            }
        });

        return Object.keys(categoryCounts).map((key, index) => ({
            name:            key,
            population:      categoryCounts[key],
            color:           PIE_COLORS[index % PIE_COLORS.length],
            legendFontColor: COLORS.black,
            legendFontSize:  13,
        }));
    }, [transactions]);

    if (chartData.length === 0) {
        return <EmptyAnalytics />;
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Secondhand Eco Impact</Text>
            <Text style={styles.subtitle}>Items saved from landfills by category</Text>

            <View style={styles.chartContainer}>
                <PieChart
                    data={chartData}
                    width={CHART_WIDTH}
                    height={CHART_HEIGHT}
                    chartConfig={CHART_CONFIG}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    center={[10, 0]}
                    absolute
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.white,
        padding: 20,
        borderRadius: 15,
        marginHorizontal: 15,
        marginTop: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.black,
    },
    subtitle: {
        fontSize: 13,
        color: COLORS.gray,
        marginTop: 2,
        marginBottom: 10,
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.gray,
        marginTop: 10,
        fontStyle: 'italic',
    },
    chartContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
});

// Memoised: only re-render when the transactions prop reference changes.
export default React.memo(ProfileAnalytics);
