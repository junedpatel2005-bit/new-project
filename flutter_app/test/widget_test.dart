import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_app/main.dart';

void main() {
  testWidgets('App loads LoginScreen when not logged in', (WidgetTester tester) async {
    await tester.pumpWidget(const KlickProApp(isLoggedIn: false));
    await tester.pump(const Duration(milliseconds: 500));

    expect(find.text('Sign In'), findsOneWidget);
    expect(find.text('Email Address'), findsOneWidget);
  });
}
